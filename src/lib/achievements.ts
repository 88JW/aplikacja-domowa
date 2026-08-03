import { db } from "@/lib/db";
import type { HomeContext } from "@/lib/home";
import { sendPushForNotifications } from "@/lib/push";

export type EarnedAchievement = {
  code: string;
  name: string;
  icon: string;
  scope: "individual" | "household";
};

export type AchievementItem = {
  code: string;
  name: string;
  description: string;
  icon: string;
  imagePath: string | null;
  scope: "individual" | "household";
  challengeGroup: "general" | "time" | "space" | "activity" | "combo";
  earnedAt: Date | null;
  progressCurrent: number;
  progressTarget: number;
  progressPercent: number;
};

export type AchievementHistoryItem = {
  code: string;
  name: string;
  icon: string;
  imagePath: string | null;
  scope: "individual" | "household";
  earnedAt: Date;
  periodStart: Date;
};

export async function evaluateAchievements(context: HomeContext) {
  const client = await db.connect();
  let newlyEarnedCodes: string[] = [];

  try {
    await client.query("begin");
    const profileEarned = await client.query<{ code: string }>(
      `
        with candidates as (
          select 'first_task'::text as code
          where (
            select count(*)
            from home_tasks.task_completions
            where completed_by = $1
              and undone_at is null
              and completed_at >= date_trunc('month', now())
          ) >= 1

          union all

          select 'ten_tasks'
          where (
            select count(*)
            from home_tasks.task_completions
            where completed_by = $1
              and undone_at is null
              and completed_at >= date_trunc('month', now())
          ) >= 10

          union all

          select 'five_categories'
          where (
            select count(distinct tta.attribute_id)
            from home_tasks.task_completions tc
            join home_tasks.task_template_attributes tta
              on tta.task_template_id = tc.task_template_id
            where tc.completed_by = $1
              and tc.undone_at is null
              and tc.completed_at >= date_trunc('month', now())
          ) >= 5

          union all

          select 'three_day_streak'
          where exists (
            select 1
            from (
              select distinct completed_at::date as day
              from home_tasks.task_completions
              where completed_by = $1
                and undone_at is null
                and completed_at >= date_trunc('month', now())
            ) days
            where days.day >= date_trunc('month', now())::date + 2
              and exists (
                select 1 from home_tasks.task_completions
                where completed_by = $1
                  and undone_at is null
                  and completed_at::date = days.day - 1
              )
              and exists (
                select 1 from home_tasks.task_completions
                where completed_by = $1
                  and undone_at is null
                  and completed_at::date = days.day - 2
              )
          )

          union all

          select time_challenge.code
          from (
            values
              ('morning_tasks'::text, 5, 10, 5),
              ('noon_tasks'::text, 10, 14, 5),
              ('afternoon_tasks'::text, 14, 18, 5),
              ('evening_tasks'::text, 18, 23, 5),
              ('night_tasks'::text, 23, 5, 3)
          ) time_challenge(code, start_hour, end_hour, target)
          where (
            select count(*)
            from home_tasks.task_completions tc
            where tc.completed_by = $1
              and tc.undone_at is null
              and tc.completed_at >= date_trunc('month', now())
              and (
                (
                  time_challenge.start_hour < time_challenge.end_hour
                  and extract(
                    hour from tc.completed_at at time zone 'Europe/Warsaw'
                  ) >= time_challenge.start_hour
                  and extract(
                    hour from tc.completed_at at time zone 'Europe/Warsaw'
                  ) < time_challenge.end_hour
                )
                or (
                  time_challenge.start_hour > time_challenge.end_hour
                  and (
                    extract(
                      hour from tc.completed_at at time zone 'Europe/Warsaw'
                    ) >= time_challenge.start_hour
                    or extract(
                      hour from tc.completed_at at time zone 'Europe/Warsaw'
                    ) < time_challenge.end_hour
                  )
                )
              )
          ) >= time_challenge.target

          union all

          select space_challenge.code
          from (
            values
              ('space_kitchen'::text, 'kitchen'::text),
              ('space_bathroom'::text, 'bathroom'::text),
              ('space_garden'::text, 'garden'::text),
              ('space_living_room'::text, 'living_room'::text),
              ('space_bedroom'::text, 'bedroom'::text),
              ('space_whole_home'::text, 'whole_home'::text)
          ) space_challenge(code, attribute_code)
          where (
            select count(*)
            from home_tasks.task_completions tc
            join home_tasks.task_template_attributes tta
              on tta.task_template_id = tc.task_template_id
            join home_tasks.task_attributes a on a.id = tta.attribute_id
            where tc.completed_by = $1
              and tc.undone_at is null
              and tc.completed_at >= date_trunc('month', now())
              and a.kind = 'space'
              and a.code = space_challenge.attribute_code
          ) >= 5

          union all

          select activity_challenge.code
          from (
            values
              ('activity_washing'::text, 'washing'::text),
              ('activity_vacuuming'::text, 'vacuuming'::text),
              ('activity_dusting'::text, 'dusting'::text),
              ('activity_tidying'::text, 'tidying'::text),
              ('activity_laundry'::text, 'laundry'::text),
              ('activity_dishes'::text, 'dishes'::text),
              ('activity_waste'::text, 'waste'::text),
              ('activity_pet_care'::text, 'pet_care'::text),
              ('activity_laundry_hanging'::text, 'laundry_hanging'::text),
              ('activity_laundry_folding'::text, 'laundry_folding'::text),
              ('activity_laundry_ironing'::text, 'laundry_ironing'::text),
              ('activity_laundry_putting_away'::text, 'laundry_putting_away'::text),
              ('activity_mowing'::text, 'mowing'::text),
              ('activity_plant_watering'::text, 'plant_watering'::text)
          ) activity_challenge(code, attribute_code)
          where (
            select count(*)
            from home_tasks.task_completions tc
            join home_tasks.task_template_attributes tta
              on tta.task_template_id = tc.task_template_id
            join home_tasks.task_attributes a on a.id = tta.attribute_id
            where tc.completed_by = $1
              and tc.undone_at is null
              and tc.completed_at >= date_trunc('month', now())
              and a.kind = 'activity'
              and a.code = activity_challenge.attribute_code
          ) >= case
            when activity_challenge.attribute_code in (
              'laundry_hanging',
              'laundry_folding',
              'laundry_ironing',
              'laundry_putting_away',
              'mowing'
            ) then 3
            when activity_challenge.attribute_code = 'plant_watering' then 4
            else 5
          end

          union all

          select combo_definition.code
          from home_tasks.achievement_definitions combo_definition
          where combo_definition.progress_kind = 'combo'
            and combo_definition.scope = 'individual'
            and (
              select count(*)
              from home_tasks.task_completions tc
              where tc.completed_by = $1
                and tc.undone_at is null
                and tc.completed_at >= date_trunc('month', now())
                and exists (
                  select 1
                  from home_tasks.task_template_attributes activity_tta
                  join home_tasks.task_attributes activity
                    on activity.id = activity_tta.attribute_id
                  where activity_tta.task_template_id = tc.task_template_id
                    and activity.kind = 'activity'
                    and activity.code = combo_definition.progress_attribute_code
                )
                and exists (
                  select 1
                  from home_tasks.task_template_attributes space_tta
                  join home_tasks.task_attributes space
                    on space.id = space_tta.attribute_id
                  where space_tta.task_template_id = tc.task_template_id
                    and space.kind = 'space'
                    and space.code = combo_definition.progress_space_code
                )
            ) >= combo_definition.target
        ),
        removed as (
          delete from home_tasks.profile_achievements pa
          where pa.profile_id = $1
            and pa.period_start = date_trunc('month', now())::date
            and not exists (
              select 1 from candidates c
              where c.code = pa.achievement_code
            )
          returning pa.achievement_code
        )
        insert into home_tasks.profile_achievements (
          profile_id,
          achievement_code,
          period_start
        )
        select $1, candidates.code, date_trunc('month', now())::date
        from candidates
        on conflict do nothing
        returning achievement_code as code
      `,
      [context.profileId],
    );

    const householdEarned = await client.query<{ code: string }>(
      `
        with candidates as (
          select 'household_25'::text as code
          where (
            select count(*)
            from home_tasks.task_completions
            where household_id = $1
              and undone_at is null
              and completed_at >= date_trunc('month', now())
          ) >= 25

          union all

          select 'everyone_week'
          where not exists (
            select 1
            from home_tasks.household_members hm
            where hm.household_id = $1
              and not exists (
                select 1
                from home_tasks.task_completions tc
                where tc.household_id = $1
                  and tc.completed_by = hm.profile_id
                  and tc.undone_at is null
                  and tc.completed_at >= greatest(
                    date_trunc('week', now()),
                    date_trunc('month', now())
                  )
              )
          )
        ),
        removed as (
          delete from home_tasks.household_achievements ha
          where ha.household_id = $1
            and ha.period_start = date_trunc('month', now())::date
            and not exists (
              select 1 from candidates c
              where c.code = ha.achievement_code
            )
          returning ha.achievement_code
        )
        insert into home_tasks.household_achievements (
          household_id,
          achievement_code,
          period_start
        )
        select $1, candidates.code, date_trunc('month', now())::date
        from candidates
        on conflict do nothing
        returning achievement_code as code
      `,
      [context.householdId],
    );
    newlyEarnedCodes = [
      ...profileEarned.rows.map((item) => item.code),
      ...householdEarned.rows.map((item) => item.code),
    ];
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }

  if (newlyEarnedCodes.length === 0) return [];

  const earnedResult = await db.query<EarnedAchievement>(
    `
      select code, name, icon, scope
      from home_tasks.achievement_definitions
      where code = any($1::text[])
      order by sort_order
    `,
    [newlyEarnedCodes],
  );
  const notificationIds: string[] = [];

  for (const achievement of earnedResult.rows) {
    const notificationResult = await db.query<{ id: string }>(
      `
        insert into home_tasks.notifications (
          household_id,
          recipient_profile_id,
          notification_type,
          title,
          body,
          href,
          dedupe_key
        )
        select
          $1,
          hm.profile_id,
          'achievement_earned',
          $3,
          $4,
          '/app/achievements',
          $5
        from home_tasks.household_members hm
        where hm.household_id = $1
          and ($2 = 'household' or hm.profile_id = $6)
        on conflict (recipient_profile_id, dedupe_key)
          where dedupe_key is not null
        do nothing
        returning id
      `,
      [
        context.householdId,
        achievement.scope,
        `${achievement.icon} Nowa odznaka: ${achievement.name}`,
        achievement.scope === "household"
          ? "Wspólna odznaka domu została odblokowana!"
          : `Brawo, ${context.profileDisplayName}! Odblokowano nowe osiągnięcie.`,
        `achievement:${new Date().toISOString().slice(0, 7)}:${achievement.code}`,
        context.profileId,
      ],
    );
    notificationIds.push(...notificationResult.rows.map((item) => item.id));
  }

  try {
    await sendPushForNotifications(notificationIds);
  } catch (error) {
    console.error("Nie udało się wysłać powiadomienia o odznace.", error);
  }

  return earnedResult.rows;
}

export async function getAchievements(context: HomeContext) {
  const result = await db.query<AchievementItem & { progressCurrent: number }>(
    `
      select
        d.code,
        d.name,
        d.description,
        d.icon,
        d.image_path as "imagePath",
        d.scope,
        d.challenge_group as "challengeGroup",
        case
          when d.scope = 'individual' then pa.earned_at
          else ha.earned_at
        end as "earnedAt",
        progress.current::int as "progressCurrent",
        d.target::int as "progressTarget",
        least(
          100,
          round(progress.current::numeric * 100 / greatest(d.target, 1))::int
        ) as "progressPercent"
      from home_tasks.achievement_definitions d
      left join home_tasks.profile_achievements pa
        on pa.achievement_code = d.code
       and pa.profile_id = $2
       and pa.period_start = date_trunc('month', now())::date
      left join home_tasks.household_achievements ha
        on ha.achievement_code = d.code
       and ha.household_id = $1
       and ha.period_start = date_trunc('month', now())::date
      cross join lateral (
        select case d.progress_kind
          when 'profile_count' then (
            select count(*)::int
            from home_tasks.task_completions tc
            where tc.household_id = $1
              and tc.completed_by = $2
              and tc.undone_at is null
              and tc.completed_at >= date_trunc('month', now())
          )
          when 'distinct_attributes' then (
            select count(distinct tta.attribute_id)::int
            from home_tasks.task_completions tc
            join home_tasks.task_template_attributes tta
              on tta.task_template_id = tc.task_template_id
            where tc.household_id = $1
              and tc.completed_by = $2
              and tc.undone_at is null
              and tc.completed_at >= date_trunc('month', now())
          )
          when 'streak' then coalesce((
            select max(run_length)::int
            from (
              select count(*) as run_length
              from (
                select
                  day,
                  day - row_number() over (order by day)::int as run_group
                from (
                  select distinct
                    (tc.completed_at at time zone 'Europe/Warsaw')::date as day
                  from home_tasks.task_completions tc
                  where tc.household_id = $1
                    and tc.completed_by = $2
                    and tc.undone_at is null
                    and tc.completed_at >= date_trunc('month', now())
                ) completion_days
              ) grouped_days
              group by run_group
            ) runs
          ), 0)
          when 'time' then (
            select count(*)::int
            from home_tasks.task_completions tc
            where tc.household_id = $1
              and tc.completed_by = $2
              and tc.undone_at is null
              and tc.completed_at >= date_trunc('month', now())
              and (
                (
                  d.progress_start_hour < d.progress_end_hour
                  and extract(hour from tc.completed_at at time zone 'Europe/Warsaw') >= d.progress_start_hour
                  and extract(hour from tc.completed_at at time zone 'Europe/Warsaw') < d.progress_end_hour
                )
                or (
                  d.progress_start_hour > d.progress_end_hour
                  and (
                    extract(hour from tc.completed_at at time zone 'Europe/Warsaw') >= d.progress_start_hour
                    or extract(hour from tc.completed_at at time zone 'Europe/Warsaw') < d.progress_end_hour
                  )
                )
              )
          )
          when 'attribute' then (
            select count(*)::int
            from home_tasks.task_completions tc
            where tc.household_id = $1
              and tc.completed_by = $2
              and tc.undone_at is null
              and tc.completed_at >= date_trunc('month', now())
              and exists (
                select 1
                from home_tasks.task_template_attributes tta
                join home_tasks.task_attributes a on a.id = tta.attribute_id
                where tta.task_template_id = tc.task_template_id
                  and a.code = d.progress_attribute_code
              )
          )
          when 'combo' then (
            select count(*)::int
            from home_tasks.task_completions tc
            where tc.household_id = $1
              and tc.completed_by = $2
              and tc.undone_at is null
              and tc.completed_at >= date_trunc('month', now())
              and exists (
                select 1
                from home_tasks.task_template_attributes tta
                join home_tasks.task_attributes a on a.id = tta.attribute_id
                where tta.task_template_id = tc.task_template_id
                  and a.kind = 'activity'
                  and a.code = d.progress_attribute_code
              )
              and exists (
                select 1
                from home_tasks.task_template_attributes tta
                join home_tasks.task_attributes a on a.id = tta.attribute_id
                where tta.task_template_id = tc.task_template_id
                  and a.kind = 'space'
                  and a.code = d.progress_space_code
              )
          )
          when 'household_count' then (
            select count(*)::int
            from home_tasks.task_completions tc
            where tc.household_id = $1
              and tc.undone_at is null
              and tc.completed_at >= date_trunc('month', now())
          )
          when 'household_members' then (
            select count(*)::int
            from home_tasks.household_members hm
            where hm.household_id = $1
              and exists (
                select 1
                from home_tasks.task_completions tc
                where tc.household_id = $1
                  and tc.completed_by = hm.profile_id
                  and tc.undone_at is null
                  and tc.completed_at >= greatest(
                    date_trunc('week', now()),
                    date_trunc('month', now())
                  )
              )
          )
          else 0
        end as current
      ) progress
      order by d.sort_order
    `,
    [context.householdId, context.profileId],
  );

  return result.rows;
}

export async function getAchievementHistory(context: HomeContext) {
  const result = await db.query<AchievementHistoryItem>(
    `
      select
        d.code,
        d.name,
        d.icon,
        d.image_path as "imagePath",
        'individual'::text as scope,
        pa.earned_at as "earnedAt",
        pa.period_start as "periodStart"
      from home_tasks.profile_achievements pa
      join home_tasks.achievement_definitions d
        on d.code = pa.achievement_code
      where pa.profile_id = $2
        and pa.period_start < date_trunc('month', now())::date

      union all

      select
        d.code,
        d.name,
        d.icon,
        d.image_path as "imagePath",
        'household'::text as scope,
        ha.earned_at as "earnedAt",
        ha.period_start as "periodStart"
      from home_tasks.household_achievements ha
      join home_tasks.achievement_definitions d
        on d.code = ha.achievement_code
      where ha.household_id = $1
        and ha.period_start < date_trunc('month', now())::date

      order by "periodStart" desc, "earnedAt" desc
    `,
    [context.householdId, context.profileId],
  );

  return result.rows;
}
