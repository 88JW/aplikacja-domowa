import { db } from "@/lib/db";
import type { HomeContext } from "@/lib/home";

export async function materializeRecurringTasks(
  context: Pick<HomeContext, "householdId">,
  scheduledFor: string,
) {
  await db.query(
    `
      insert into home_tasks.planned_tasks (
        household_id,
        task_template_id,
        scheduled_for,
        assigned_to,
        created_by,
        recurring_rule_id
      )
      select
        r.household_id,
        r.task_template_id,
        $2::date,
        r.assigned_to,
        r.created_by,
        r.id
      from home_tasks.recurring_task_rules r
      where r.household_id = $1
        and r.active = true
        and r.starts_on <= $2::date
        and (
          r.frequency = 'daily'
          or (
            r.frequency = 'weekly'
            and r.day_of_week = extract(dow from $2::date)::smallint
          )
          or (
            r.frequency = 'interval'
            and $2::date >= coalesce(
              (
                select max(
                  (tc.completed_at at time zone 'Europe/Warsaw')::date
                  + r.interval_days
                )
                from home_tasks.task_completions tc
                where tc.household_id = r.household_id
                  and tc.task_template_id = r.task_template_id
                  and tc.undone_at is null
              ),
              r.starts_on
            )
            and not exists (
              select 1
              from home_tasks.planned_tasks open_task
              where open_task.recurring_rule_id = r.id
                and open_task.status in ('todo', 'in_progress')
            )
          )
        )
      on conflict (recurring_rule_id, scheduled_for)
        where recurring_rule_id is not null
      do nothing
    `,
    [context.householdId, scheduledFor],
  );
}
