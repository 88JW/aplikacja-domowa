import { db } from "@/lib/db";
import type { HomeContext } from "@/lib/home";

export type PlantWateringStatus = {
  templateId: string;
  name: string;
  icon: string | null;
  spaceName: string;
  lastCompletedAt: Date | null;
  daysSince: number | null;
  nextDueOn: string;
  daysRemaining: number;
  progressPercent: number;
  plannedTaskId: string | null;
};

export async function getPlantWateringStatuses(context: HomeContext) {
  const result = await db.query<PlantWateringStatus>(
    `
      with watering_tasks as (
        select distinct tt.id, tt.name, tt.icon
        from home_tasks.task_templates tt
        join home_tasks.task_template_attributes activity_tta
          on activity_tta.task_template_id = tt.id
        join home_tasks.task_attributes activity
          on activity.id = activity_tta.attribute_id
         and activity.kind = 'activity'
         and activity.code = 'plant_watering'
        where tt.household_id = $1
          and tt.archived_at is null
      )
      select
        wt.id as "templateId",
        wt.name,
        wt.icon,
        space.name as "spaceName",
        last_completion.completed_at as "lastCompletedAt",
        case
          when last_completion.completed_at is null then null
          else (
            (now() at time zone 'Europe/Warsaw')::date
            - (last_completion.completed_at at time zone 'Europe/Warsaw')::date
          )::int
        end as "daysSince",
        to_char(
          coalesce(
            (last_completion.completed_at at time zone 'Europe/Warsaw')::date + 4,
            (now() at time zone 'Europe/Warsaw')::date
          ),
          'YYYY-MM-DD'
        ) as "nextDueOn",
        (
          coalesce(
            (last_completion.completed_at at time zone 'Europe/Warsaw')::date + 4,
            (now() at time zone 'Europe/Warsaw')::date
          ) - (now() at time zone 'Europe/Warsaw')::date
        )::int as "daysRemaining",
        case
          when last_completion.completed_at is null then 100
          else least(100, greatest(0, round(
            (
              (now() at time zone 'Europe/Warsaw')::date
              - (last_completion.completed_at at time zone 'Europe/Warsaw')::date
            )::numeric * 100 / 4
          )::int))
        end as "progressPercent",
        open_task.id as "plannedTaskId"
      from watering_tasks wt
      left join lateral (
        select a.name
        from home_tasks.task_template_attributes tta
        join home_tasks.task_attributes a on a.id = tta.attribute_id
        where tta.task_template_id = wt.id and a.kind = 'space'
        order by a.sort_order
        limit 1
      ) space on true
      left join lateral (
        select tc.completed_at
        from home_tasks.task_completions tc
        where tc.household_id = $1
          and tc.task_template_id = wt.id
          and tc.undone_at is null
        order by tc.completed_at desc
        limit 1
      ) last_completion on true
      left join lateral (
        select pt.id
        from home_tasks.planned_tasks pt
        where pt.household_id = $1
          and pt.task_template_id = wt.id
          and pt.status in ('todo', 'in_progress')
          and (pt.assigned_to is null or pt.assigned_to = $2)
        order by pt.scheduled_for, pt.created_at
        limit 1
      ) open_task on true
      order by space.name
    `,
    [context.householdId, context.profileId],
  );

  return result.rows;
}
