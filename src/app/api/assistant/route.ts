import { completeUnplannedTask } from "@/app/app/actions";
import { db } from "@/lib/db";
import { ensureHomeContext, type HomeContext } from "@/lib/home";
import { requireSsoUser } from "@/lib/sso";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

const actionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("complete_task"), taskTemplateId: z.string().uuid(), label: z.string().max(120) }),
  z.object({ type: z.literal("mark_waste_bags"), count: z.number().int().min(1).max(8), label: z.string().max(120) }),
  z.object({ type: z.literal("schedule_task"), taskTemplateId: z.string().uuid(), scheduledFor: z.iso.date(), label: z.string().max(120) }),
]);

const requestSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("message"), message: z.string().trim().min(1).max(800), history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(1000) })).max(10).optional() }),
  z.object({ kind: z.literal("execute"), action: actionSchema }),
]);

const aiResultSchema = z.object({ reply: z.string().trim().min(1).max(1200), action: actionSchema.nullable() });

function warsawDate() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Warsaw", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

async function getAssistantContext(context: HomeContext) {
  const today = warsawDate();
  const result = await db.query<{
    id: string; name: string; attributes: string[]; last_completed: string | null; today_planned: boolean;
  }>(`
    select tt.id, tt.name,
      coalesce(array_agg(a.name order by a.name) filter (where a.id is not null), '{}') as attributes,
      max(tc.completed_at)::date::text as last_completed,
      bool_or(pt.id is not null) filter (where pt.status in ('todo', 'in_progress')) as today_planned
    from home_tasks.task_templates tt
    left join home_tasks.task_template_attributes tta on tta.task_template_id = tt.id
    left join home_tasks.task_attributes a on a.id = tta.attribute_id
    left join home_tasks.task_completions tc on tc.task_template_id = tt.id and tc.household_id = tt.household_id and tc.undone_at is null
    left join home_tasks.planned_tasks pt on pt.task_template_id = tt.id and pt.household_id = tt.household_id and pt.scheduled_for = $2::date
    where tt.household_id = $1 and tt.archived_at is null
    group by tt.id, tt.name
    order by tt.name`, [context.householdId, today]);
  const bags = await db.query<{ count: number }>(
    `select count(*)::int as count from home_tasks.waste_bag_outings where household_id = $1 and month_start = date_trunc('month', $2::date)::date`,
    [context.householdId, today],
  );
  return { today, wasteBagsOut: bags.rows[0]?.count ?? 0, tasks: result.rows };
}

async function callGemini(message: string, history: Array<{ role: "user" | "assistant"; content: string }>, state: Awaited<ReturnType<typeof getAssistantContext>>) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("Gemini is not configured");
  const prompt = [
    "Jesteś Domowym Asystentem HomeApp. Odpowiadasz po polsku, pomocnie i zwięźle.",
    "Możesz swobodnie rozmawiać (np. pomysły na potrawy), analizować stan domu i ZAPROPONOWAĆ tylko jedną z akcji opisanych w schemacie.",
    "Nigdy nie twierdzisz, że zmiana została wykonana: użytkownik musi ją zatwierdzić w aplikacji.",
    "Zaproponuj akcję WYŁĄCZNIE, gdy użytkownik jasno chce zmienić dane albo oznajmia, że właśnie wykonał czynność. Na każde pytanie (np. 'ile', 'co', 'kiedy', 'czy') ustaw action na null.",
    "Nie proponuj usuwania danych, zmian kont, sekretów, komend serwera, Zigbee ani ESP32. Integracje te będą dodawane później jako osobne, ograniczone narzędzia.",
    `Dzisiaj: ${state.today}. Wystawione worki w tym miesiącu: ${state.wasteBagsOut}/8.`,
    `Katalog i historia: ${JSON.stringify(state.tasks)}`,
    `Ostatnie wiadomości: ${JSON.stringify(history)}`,
    `Najnowsza wiadomość użytkownika: ${JSON.stringify(message)}`,
  ].join("\n");
  const requestBody = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json", responseSchema: {
        type: "OBJECT", properties: {
          reply: { type: "STRING" },
          action: { nullable: true, anyOf: [
            { type: "OBJECT", properties: { type: { type: "STRING", enum: ["complete_task"] }, taskTemplateId: { type: "STRING" }, label: { type: "STRING" } }, required: ["type", "taskTemplateId", "label"] },
            { type: "OBJECT", properties: { type: { type: "STRING", enum: ["mark_waste_bags"] }, count: { type: "INTEGER" }, label: { type: "STRING" } }, required: ["type", "count", "label"] },
            { type: "OBJECT", properties: { type: { type: "STRING", enum: ["schedule_task"] }, taskTemplateId: { type: "STRING" }, scheduledFor: { type: "STRING" }, label: { type: "STRING" } }, required: ["type", "taskTemplateId", "scheduledFor", "label"] },
          ] },
        }, required: ["reply", "action"],
      } },
  });
  let response: Response | null = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${encodeURIComponent(key)}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(12_000), body: requestBody,
    });
    if (response.ok || response.status !== 503) break;
    await new Promise((resolve) => setTimeout(resolve, 700));
  }
  if (!response?.ok) throw new Error(`Gemini returned ${response?.status ?? "no response"}`);
  const body = (await response.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  return aiResultSchema.parse(JSON.parse(body.candidates?.[0]?.content?.parts?.[0]?.text ?? ""));
}

async function executeAction(context: HomeContext, action: z.infer<typeof actionSchema>) {
  if (action.type === "complete_task") {
    const formData = new FormData(); formData.set("taskTemplateId", action.taskTemplateId);
    await completeUnplannedTask(formData);
    return `Zapisano wykonanie: ${action.label}.`;
  }
  if (action.type === "mark_waste_bags") {
    const today = warsawDate();
    const inserted = await db.query<{ bag_number: number }>(
      `insert into home_tasks.waste_bag_outings (household_id, month_start, bag_number, marked_by)
       select $1, date_trunc('month', $2::date)::date, bag_number, $3
       from generate_series(1, 8) as bag_number
       where not exists (select 1 from home_tasks.waste_bag_outings w where w.household_id = $1 and w.month_start = date_trunc('month', $2::date)::date and w.bag_number = bag_number)
       order by bag_number limit $4 returning bag_number`,
      [context.householdId, today, context.profileId, action.count],
    );
    revalidatePath("/app/trash");
    return inserted.rowCount ? `Zaznaczono ${inserted.rowCount} ${inserted.rowCount === 1 ? "worek" : "worki"} jako wystawione.` : "Wszystkie 8 worków jest już oznaczonych jako wystawione.";
  }
  const exists = await db.query(`select id from home_tasks.task_templates where id = $1 and household_id = $2 and archived_at is null`, [action.taskTemplateId, context.householdId]);
  if (exists.rowCount !== 1) throw new Error("Zadanie nie jest dostępne.");
  await db.query(`insert into home_tasks.planned_tasks (household_id, task_template_id, scheduled_for, created_by) values ($1, $2, $3::date, $4)`, [context.householdId, action.taskTemplateId, action.scheduledFor, context.profileId]);
  revalidatePath("/app"); revalidatePath("/app/plan");
  return `Zaplanowano: ${action.label}.`;
}

export async function POST(request: Request) {
  try {
    const input = requestSchema.parse(await request.json());
    const user = await requireSsoUser();
    const context = await ensureHomeContext(user);
    if (input.kind === "execute") return NextResponse.json({ reply: await executeAction(context, input.action), action: null });
    const state = await getAssistantContext(context);
    const result = await callGemini(input.message, input.history ?? [], state);
    const allowedIds = new Set(state.tasks.map((task) => task.id));
    const action = result.action && ((result.action.type === "mark_waste_bags") || allowedIds.has(result.action.taskTemplateId)) ? result.action : null;
    return NextResponse.json({ reply: result.reply, action });
  } catch (error) {
    console.error("Home assistant failed", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ reply: "Nie mogę teraz połączyć się z asystentem. Spróbuj za chwilę.", action: null }, { status: 503 });
  }
}
