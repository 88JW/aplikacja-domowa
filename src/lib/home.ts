import { db } from "@/lib/db";
import { materializeRecurringTasks } from "@/lib/recurring";
import type { SsoUser } from "@/lib/sso";
import { cookies } from "next/headers";

export const ACTIVE_PROFILE_COOKIE = "homeapp-active-profile";

export type HomeContext = {
  profileId: string;
  profileDisplayName: string;
  profileEmail: string;
  householdId: string;
  householdName: string;
};

export type HouseholdMember = {
  profileId: string;
  displayName: string;
  email: string;
};

export type TodayTask = {
  id: string;
  name: string;
  icon: string | null;
  attributes: Array<{
    name: string;
    icon: string | null;
    kind: "space" | "activity";
  }>;
  assignedToName: string | null;
};

export type DashboardData = {
  context: HomeContext;
  todayTasks: TodayTask[];
  userWeeklyPoints: number;
  householdWeeklyPoints: number;
};

export async function ensureHomeContext(
  user: SsoUser,
): Promise<HomeContext> {
  const selectedCookie = (await cookies()).get(ACTIVE_PROFILE_COOKIE)?.value;
  const selectedProfileId =
    selectedCookie &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      selectedCookie,
    )
      ? selectedCookie
      : null;
  const client = await db.connect();

  try {
    await client.query("begin");

    const profileResult = await client.query<{
      id: string;
      display_name: string;
      email: string;
    }>(
      `
        insert into home_tasks.profiles (
          sso_subject,
          email,
          display_name
        )
        values ($1, $2, $3)
        on conflict (sso_subject) do update
        set
          email = excluded.email,
          updated_at = now()
        returning id, display_name, email
      `,
      [user.subject, user.email, user.displayName],
    );

    const authenticatedProfile = profileResult.rows[0];
    const membershipResult = await client.query<{
      household_id: string;
      household_name: string;
    }>(
      `
        select
          hm.household_id,
          h.name as household_name
        from home_tasks.household_members hm
        join home_tasks.households h on h.id = hm.household_id
        where hm.profile_id = $1
        limit 1
      `,
      [authenticatedProfile.id],
    );

    let household: { id: string; name: string };

    if (membershipResult.rows[0]) {
      household = {
        id: membershipResult.rows[0].household_id,
        name: membershipResult.rows[0].household_name,
      };
    } else {
      const householdResult = await client.query<{
        id: string;
        name: string;
      }>(
        `
          select id, name
          from home_tasks.households
          order by created_at
          limit 1
        `,
      );

      household = householdResult.rows[0];

      if (!household) {
        const createdHousehold = await client.query<{
          id: string;
          name: string;
        }>(
          `
            insert into home_tasks.households (name)
            values ('Nasz dom')
            returning id, name
          `,
        );
        household = createdHousehold.rows[0];

        await client.query(
          "select home_tasks.seed_household_catalog($1, $2)",
          [household.id, authenticatedProfile.id],
        );
      }

      const memberCountResult = await client.query<{ count: string }>(
        `
          select count(*)::text as count
          from home_tasks.household_members
          where household_id = $1
        `,
        [household.id],
      );
      const role =
        Number(memberCountResult.rows[0].count) === 0 ? "admin" : "member";

      await client.query(
        `
          insert into home_tasks.household_members (
            household_id,
            profile_id,
            role
          )
          values ($1, $2, $3)
          on conflict do nothing
        `,
        [household.id, authenticatedProfile.id, role],
      );
    }

    const activeProfileResult = await client.query<{
      id: string;
      display_name: string;
      email: string;
    }>(
      `
        select p.id, p.display_name, p.email
        from home_tasks.household_members hm
        join home_tasks.profiles p on p.id = hm.profile_id
        where hm.household_id = $1
          and (
            p.id = $2::uuid
            or p.id = $3::uuid
          )
        order by case when p.id = $2::uuid then 0 else 1 end
        limit 1
      `,
      [household.id, selectedProfileId ?? null, authenticatedProfile.id],
    );
    const activeProfile = activeProfileResult.rows[0] ?? authenticatedProfile;

    await client.query("commit");
    return {
      profileId: activeProfile.id,
      profileDisplayName: activeProfile.display_name,
      profileEmail: activeProfile.email,
      householdId: household.id,
      householdName: household.name,
    };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function getHouseholdMembers(
  context: HomeContext,
): Promise<HouseholdMember[]> {
  const result = await db.query<HouseholdMember>(
    `
      select
        p.id as "profileId",
        p.display_name as "displayName",
        p.email
      from home_tasks.household_members hm
      join home_tasks.profiles p on p.id = hm.profile_id
      where hm.household_id = $1
      order by
        case when lower(p.email) = 'iza.hille@gmail.com' then 0 else 1 end,
        p.display_name
    `,
    [context.householdId],
  );

  return result.rows;
}

export async function getDashboardData(
  user: SsoUser,
): Promise<DashboardData> {
  const context = await ensureHomeContext(user);
  const today = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Warsaw",
  }).format(new Date());
  await materializeRecurringTasks(context, today);

  const [tasksResult, userPointsResult, householdPointsResult] =
    await Promise.all([
      db.query<TodayTask>(
        `
          select
            pt.id,
            tt.name,
            tt.icon,
            coalesce((
              select jsonb_agg(
                jsonb_build_object(
                  'name', a.name,
                  'icon', a.icon,
                  'kind', a.kind
                )
                order by a.kind desc, a.sort_order, a.name
              )
              from home_tasks.task_template_attributes tta
              join home_tasks.task_attributes a on a.id = tta.attribute_id
              where tta.task_template_id = tt.id
            ), '[]'::jsonb) as attributes,
            p.display_name as "assignedToName"
          from home_tasks.planned_tasks pt
          join home_tasks.task_templates tt on tt.id = pt.task_template_id
          left join home_tasks.profiles p on p.id = pt.assigned_to
          where pt.household_id = $1
            and pt.scheduled_for = current_date
            and pt.status in ('todo', 'in_progress')
            and (pt.assigned_to is null or pt.assigned_to = $2)
          order by pt.created_at
        `,
        [context.householdId, context.profileId],
      ),
      db.query<{ points: number }>(
        `
          select count(*)::int as points
          from home_tasks.task_completions
          where household_id = $1
            and completed_by = $2
            and undone_at is null
            and completed_at >= date_trunc('week', now())
        `,
        [context.householdId, context.profileId],
      ),
      db.query<{ points: number }>(
        `
          select count(*)::int as points
          from home_tasks.task_completions
          where household_id = $1
            and undone_at is null
            and completed_at >= date_trunc('week', now())
        `,
        [context.householdId],
      ),
    ]);

  return {
    context,
    todayTasks: tasksResult.rows,
    userWeeklyPoints: userPointsResult.rows[0]?.points ?? 0,
    householdWeeklyPoints: householdPointsResult.rows[0]?.points ?? 0,
  };
}
