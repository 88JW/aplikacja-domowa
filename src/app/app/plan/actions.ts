"use server";

import { db } from "@/lib/db";
import { ensureHomeContext } from "@/lib/home";
import { requireSsoUser } from "@/lib/sso";
import { sendPushForNotifications } from "@/lib/push";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const scheduleTaskSchema = z.object({
  taskTemplateId: z.string().uuid(),
  scheduledFor: z.iso.date(),
  assignedTo: z.union([z.literal(""), z.string().uuid()]),
  frequency: z.enum(["once", "daily", "weekly", "every_four_days"]),
});

export async function scheduleTask(formData: FormData) {
  const user = await requireSsoUser();
  const context = await ensureHomeContext(user);
  const values = scheduleTaskSchema.parse({
    taskTemplateId: formData.get("taskTemplateId"),
    scheduledFor: formData.get("scheduledFor"),
    assignedTo: formData.get("assignedTo") ?? "",
    frequency: formData.get("frequency") ?? "once",
  });

  const client = await db.connect();
  let rowCount = 0;
  let notificationIds: string[] = [];

  try {
    await client.query("begin");
    let recurringRuleId: string | null = null;

    if (values.frequency !== "once") {
      const recurringRule = await client.query<{ id: string }>(
        `
          insert into home_tasks.recurring_task_rules (
            household_id,
            task_template_id,
            assigned_to,
            created_by,
            frequency,
            day_of_week,
            starts_on,
            interval_days
          )
          select
            $1,
            tt.id,
            member.profile_id,
            $4,
            case when $6 = 'every_four_days' then 'interval' else $6 end,
            case
              when $6 = 'weekly'
              then extract(dow from $3::date)::smallint
              else null
            end,
            $3::date,
            case when $6 = 'every_four_days' then 4 else null end
          from home_tasks.task_templates tt
          left join home_tasks.household_members member
            on member.household_id = $1
           and member.profile_id = nullif($2, '')::uuid
          where tt.id = $5
            and tt.household_id = $1
            and ($2 = '' or member.profile_id is not null)
          returning id
        `,
        [
          context.householdId,
          values.assignedTo,
          values.scheduledFor,
          context.profileId,
          values.taskTemplateId,
          values.frequency,
        ],
      );
      recurringRuleId = recurringRule.rows[0]?.id ?? null;
    }

    const result = await client.query<{ id: string }>(
      `
        insert into home_tasks.planned_tasks (
          household_id,
          task_template_id,
          scheduled_for,
          assigned_to,
          created_by,
          recurring_rule_id
        )
        select $1, tt.id, $3::date, member.profile_id, $4, $6
        from home_tasks.task_templates tt
        left join home_tasks.household_members member
          on member.household_id = $1
         and member.profile_id = nullif($2, '')::uuid
        where tt.id = $5
          and tt.household_id = $1
          and ($2 = '' or member.profile_id is not null)
        returning id
      `,
      [
        context.householdId,
        values.assignedTo,
        values.scheduledFor,
        context.profileId,
        values.taskTemplateId,
        recurringRuleId,
      ],
    );
    rowCount = result.rowCount ?? 0;

    if (result.rows[0]) {
      const notifications = await client.query<{ id: string }>(
        `
          insert into home_tasks.notifications (
            household_id,
            recipient_profile_id,
            actor_profile_id,
            planned_task_id,
            notification_type,
            title,
            body,
            href
          )
          select
            $1,
            hm.profile_id,
            $2,
            $3,
            'task_assigned',
            case
              when $4 = '' then 'Nowe zadanie dla wszystkich'
              else 'Nowe zadanie dla Ciebie'
            end,
            $5 || ': „' || tt.name || '” na ' ||
              to_char($6::date, 'DD.MM.YYYY'),
            '/app/plan?date=' || $6
          from home_tasks.household_members hm
          cross join home_tasks.task_templates tt
          where hm.household_id = $1
            and hm.profile_id <> $2
            and tt.id = $7
            and tt.household_id = $1
            and (
              $4 = ''
              or hm.profile_id = nullif($4, '')::uuid
            )
          on conflict do nothing
          returning id
        `,
        [
          context.householdId,
          context.profileId,
          result.rows[0].id,
          values.assignedTo,
          `Nowe przypisanie od ${context.profileDisplayName}`,
          values.scheduledFor,
          values.taskTemplateId,
        ],
      );
      notificationIds = notifications.rows.map((item) => item.id);
    }

    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }

  if (rowCount !== 1) {
    throw new Error("Nie udało się zaplanować zadania.");
  }

  try {
    await sendPushForNotifications(notificationIds);
  } catch (error) {
    console.error("Nie udało się wysłać powiadomienia push.", error);
  }

  revalidatePath("/app");
  revalidatePath("/app/plan");
  revalidatePath("/app/notifications");
  revalidatePath("/app", "layout");
  revalidatePath("/app/map");
  revalidatePath("/tablet");
  redirect(`/app/plan?date=${values.scheduledFor}`);
}
