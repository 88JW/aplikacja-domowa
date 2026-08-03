import { db } from "@/lib/db";
import type { HomeContext } from "@/lib/home";

export type StreakStats = {
  profileCurrent: number;
  profileBestThisMonth: number;
  householdCurrent: number;
  householdBestThisMonth: number;
};

export async function getStreakStats(context: HomeContext): Promise<StreakStats> {
  const result = await db.query<StreakStats>(
    `
      with profile_days as (
        select distinct (completed_at at time zone 'Europe/Warsaw')::date as day
        from home_tasks.task_completions
        where household_id = $1
          and completed_by = $2
          and undone_at is null
      ),
      household_days as (
        select distinct (completed_at at time zone 'Europe/Warsaw')::date as day
        from home_tasks.task_completions
        where household_id = $1 and undone_at is null
      ),
      profile_anchor as (
        select case
          when exists (
            select 1 from profile_days
            where day = (now() at time zone 'Europe/Warsaw')::date
          ) then (now() at time zone 'Europe/Warsaw')::date
          when exists (
            select 1 from profile_days
            where day = (now() at time zone 'Europe/Warsaw')::date - 1
          ) then (now() at time zone 'Europe/Warsaw')::date - 1
        end as day
      ),
      household_anchor as (
        select case
          when exists (
            select 1 from household_days
            where day = (now() at time zone 'Europe/Warsaw')::date
          ) then (now() at time zone 'Europe/Warsaw')::date
          when exists (
            select 1 from household_days
            where day = (now() at time zone 'Europe/Warsaw')::date - 1
          ) then (now() at time zone 'Europe/Warsaw')::date - 1
        end as day
      ),
      profile_numbered as (
        select
          pd.day,
          row_number() over (order by pd.day desc)::int as position,
          pa.day as anchor
        from profile_days pd
        cross join profile_anchor pa
        where pa.day is not null and pd.day <= pa.day
      ),
      household_numbered as (
        select
          hd.day,
          row_number() over (order by hd.day desc)::int as position,
          ha.day as anchor
        from household_days hd
        cross join household_anchor ha
        where ha.day is not null and hd.day <= ha.day
      ),
      profile_month_groups as (
        select
          day,
          day - row_number() over (order by day)::int as run_group
        from profile_days
        where day >= date_trunc('month', now() at time zone 'Europe/Warsaw')::date
      ),
      household_month_groups as (
        select
          day,
          day - row_number() over (order by day)::int as run_group
        from household_days
        where day >= date_trunc('month', now() at time zone 'Europe/Warsaw')::date
      )
      select
        coalesce((
          select count(*)::int
          from profile_numbered
          where day = anchor - (position - 1)
        ), 0) as "profileCurrent",
        coalesce((
          select max(run_length)::int
          from (
            select count(*) as run_length
            from profile_month_groups
            group by run_group
          ) profile_runs
        ), 0) as "profileBestThisMonth",
        coalesce((
          select count(*)::int
          from household_numbered
          where day = anchor - (position - 1)
        ), 0) as "householdCurrent",
        coalesce((
          select max(run_length)::int
          from (
            select count(*) as run_length
            from household_month_groups
            group by run_group
          ) household_runs
        ), 0) as "householdBestThisMonth"
    `,
    [context.householdId, context.profileId],
  );

  return (
    result.rows[0] ?? {
      profileCurrent: 0,
      profileBestThisMonth: 0,
      householdCurrent: 0,
      householdBestThisMonth: 0,
    }
  );
}
