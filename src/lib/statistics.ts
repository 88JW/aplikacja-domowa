import { db } from "@/lib/db";
import type { HomeContext } from "@/lib/home";

export type StatisticsData = {
  memberTotals: Array<{ profileId: string; displayName: string; count: number }>;
  daily: Array<{ day: string; profileId: string; count: number }>;
  spaces: Array<{ name: string; icon: string | null; count: number }>;
  activities: Array<{ name: string; icon: string | null; count: number }>;
  total30Days: number;
  averagePerActiveDay: number;
  mostActiveDay: string | null;
};

export async function getStatistics(context: HomeContext): Promise<StatisticsData> {
  const [memberTotals, daily, spaces, activities, summary] = await Promise.all([
    db.query<{ profileId: string; displayName: string; count: number }>(
      `
        select
          p.id as "profileId",
          p.display_name as "displayName",
          count(tc.id)::int as count
        from home_tasks.household_members hm
        join home_tasks.profiles p on p.id = hm.profile_id
        left join home_tasks.task_completions tc
          on tc.completed_by = p.id
         and tc.household_id = hm.household_id
         and tc.undone_at is null
         and tc.completed_at >= now() - interval '30 days'
        where hm.household_id = $1
        group by p.id, p.display_name
        order by count desc, p.display_name
      `,
      [context.householdId],
    ),
    db.query<{ day: string; profileId: string; count: number }>(
      `
        select
          to_char(days.day, 'YYYY-MM-DD') as day,
          p.id as "profileId",
          count(tc.id)::int as count
        from generate_series(
          (now() at time zone 'Europe/Warsaw')::date - 13,
          (now() at time zone 'Europe/Warsaw')::date,
          interval '1 day'
        ) days(day)
        cross join home_tasks.household_members hm
        join home_tasks.profiles p on p.id = hm.profile_id
        left join home_tasks.task_completions tc
          on tc.household_id = hm.household_id
         and tc.completed_by = p.id
         and tc.undone_at is null
         and (tc.completed_at at time zone 'Europe/Warsaw')::date = days.day::date
        where hm.household_id = $1
        group by days.day, p.id
        order by days.day, p.display_name
      `,
      [context.householdId],
    ),
    db.query<{ name: string; icon: string | null; count: number }>(
      `
        select a.name, a.icon, count(distinct tc.id)::int as count
        from home_tasks.task_completions tc
        join home_tasks.task_template_attributes tta
          on tta.task_template_id = tc.task_template_id
        join home_tasks.task_attributes a on a.id = tta.attribute_id
        where tc.household_id = $1
          and tc.undone_at is null
          and tc.completed_at >= now() - interval '30 days'
          and a.kind = 'space'
        group by a.id, a.name, a.icon
        order by count desc, a.name
        limit 8
      `,
      [context.householdId],
    ),
    db.query<{ name: string; icon: string | null; count: number }>(
      `
        select a.name, a.icon, count(distinct tc.id)::int as count
        from home_tasks.task_completions tc
        join home_tasks.task_template_attributes tta
          on tta.task_template_id = tc.task_template_id
        join home_tasks.task_attributes a on a.id = tta.attribute_id
        where tc.household_id = $1
          and tc.undone_at is null
          and tc.completed_at >= now() - interval '30 days'
          and a.kind = 'activity'
        group by a.id, a.name, a.icon
        order by count desc, a.name
        limit 8
      `,
      [context.householdId],
    ),
    db.query<{ total: number; activeDays: number; mostActiveDay: string | null }>(
      `
        with daily_counts as (
          select
            (completed_at at time zone 'Europe/Warsaw')::date as day,
            count(*)::int as count
          from home_tasks.task_completions
          where household_id = $1
            and undone_at is null
            and completed_at >= now() - interval '30 days'
          group by day
        )
        select
          coalesce(sum(count), 0)::int as total,
          count(*)::int as "activeDays",
          (select day::text from daily_counts order by count desc, day desc limit 1)
            as "mostActiveDay"
        from daily_counts
      `,
      [context.householdId],
    ),
  ]);
  const summaryRow = summary.rows[0];

  return {
    memberTotals: memberTotals.rows,
    daily: daily.rows,
    spaces: spaces.rows,
    activities: activities.rows,
    total30Days: summaryRow?.total ?? 0,
    averagePerActiveDay:
      summaryRow?.activeDays > 0
        ? Math.round((summaryRow.total / summaryRow.activeDays) * 10) / 10
        : 0,
    mostActiveDay: summaryRow?.mostActiveDay ?? null,
  };
}
