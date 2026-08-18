import { db } from "@/lib/db";
import { ensureHomeContext } from "@/lib/home";
import { requireSsoUser } from "@/lib/sso";
import { NextResponse } from "next/server";
import { z } from "zod";

const requestSchema = z.object({
  transcript: z.string().trim().min(2).max(300),
});

const aiResponseSchema = z.object({
  matchId: z.string().uuid().nullable(),
  confidence: z.enum(["high", "medium", "low"]),
  suggestionIds: z.array(z.string().uuid()).max(3),
});

type CatalogTask = {
  id: string;
  name: string;
  attributes: string[];
};

async function getCatalogTasks(householdId: string): Promise<CatalogTask[]> {
  const result = await db.query<CatalogTask>(
    `
      select
        tt.id,
        tt.name,
        coalesce(array_agg(a.name order by a.kind desc, a.sort_order, a.name)
          filter (where a.id is not null), '{}') as attributes
      from home_tasks.task_templates tt
      left join home_tasks.task_template_attributes tta on tta.task_template_id = tt.id
      left join home_tasks.task_attributes a on a.id = tta.attribute_id
      where tt.household_id = $1 and tt.archived_at is null
      group by tt.id, tt.name
      order by tt.name
    `,
    [householdId],
  );
  return result.rows;
}

export async function POST(request: Request) {
  try {
    const user = await requireSsoUser();
    const context = await ensureHomeContext(user);
    const { transcript } = requestSchema.parse(await request.json());
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ available: false }, { status: 503 });
    }

    const tasks = await getCatalogTasks(context.householdId);
    const taskIds = new Set(tasks.map((task) => task.id));
    const prompt = [
      "Dopasuj polskie, potoczne zdanie o wykonanym obowiązku domowym do listy zadań.",
      "Nie wymyślaj zadań. Wybieraj wyłącznie ID z katalogu.",
      "matchId ustaw tylko gdy jesteś wyraźnie pewny. suggestionIds zawiera do trzech najlepszych, różnych ID.",
      "Odpowiedz wyłącznie JSON-em zgodnym ze schematem.",
      `Wypowiedź użytkownika: ${JSON.stringify(transcript)}`,
      `Katalog: ${JSON.stringify(tasks)}`,
    ].join("\n");

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                matchId: { type: "STRING", nullable: true },
                confidence: { type: "STRING", enum: ["high", "medium", "low"] },
                suggestionIds: { type: "ARRAY", items: { type: "STRING" } },
              },
              required: ["matchId", "confidence", "suggestionIds"],
            },
          },
        }),
        signal: AbortSignal.timeout(8_000),
      },
    );

    if (!response.ok) {
      console.error("Gemini task matching failed", response.status);
      return NextResponse.json({ available: false }, { status: 503 });
    }

    const payload = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
    const result = aiResponseSchema.parse(JSON.parse(text ?? ""));
    const suggestionIds = result.suggestionIds.filter((id) => taskIds.has(id));
    const matchId = result.matchId && taskIds.has(result.matchId) ? result.matchId : null;

    return NextResponse.json({
      available: true,
      matchId: result.confidence === "high" ? matchId : null,
      suggestionIds,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Nieprawidłowe polecenie." }, { status: 400 });
    }
    console.error("Task matching failed", error);
    return NextResponse.json({ available: false }, { status: 503 });
  }
}
