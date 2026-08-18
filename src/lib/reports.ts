import { db } from "@/lib/db";
import type { HomeContext } from "@/lib/home";

export type HistoryItem = {
  id: string;
  taskName: string;
  icon: string | null;
  attributes: Array<{
    name: string;
    icon: string | null;
    kind: "space" | "activity";
  }>;
  completedByName: string;
  completedAt: Date;
  undoneAt: Date | null;
  isOwn: boolean;
  canDelete: boolean;
  canRestore: boolean;
};

export type RankingItem = {
  profileId: string;
  displayName: string;
  email: string;
  points: number;
};

export type CompletionMatrix = {
  columns: Array<{
    taskTemplateId: string;
    name: string;
    icon: string | null;
  }>;
  rows: Array<{
    profileId: string;
    displayName: string;
    counts: Record<string, number>;
    total: number;
  }>;
};

export async function getHistory(context: HomeContext, limit = 50) {
  const result = await db.query<HistoryItem>(
    `
      select
        tc.id,
        tt.name as "taskName",
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
        p.display_name as "completedByName",
        tc.completed_at as "completedAt",
        tc.undone_at as "undoneAt",
        tc.completed_by = $2 as "isOwn",
        tc.undone_at is null as "canDelete",
        tc.undone_at is not null as "canRestore"
      from home_tasks.task_completions tc
      join home_tasks.task_templates tt on tt.id = tc.task_template_id
      join home_tasks.profiles p on p.id = tc.completed_by
      where tc.household_id = $1
      order by tc.completed_at desc
      limit $3
    `,
    [context.householdId, context.profileId, limit],
  );

  return result.rows;
}

export async function getRanking(
  context: HomeContext,
  period: "week" | "month",
) {
  const periodExpression =
    period === "week" ? "date_trunc('week', now())" : "date_trunc('month', now())";
  const result = await db.query<RankingItem>(
    `
      select
        p.id as "profileId",
        p.display_name as "displayName",
        p.email,
        count(tc.id)::int as points
      from home_tasks.household_members hm
      join home_tasks.profiles p on p.id = hm.profile_id
      left join home_tasks.task_completions tc
        on tc.completed_by = p.id
       and tc.household_id = hm.household_id
       and tc.undone_at is null
       and tc.completed_at >= ${periodExpression}
      where hm.household_id = $1
      group by p.id, p.display_name, p.email
      order by points desc, p.display_name
    `,
    [context.householdId],
  );

  return result.rows;
}

export async function getMonthlyCompletionMatrix(
  context: HomeContext,
): Promise<CompletionMatrix> {
  const [membersResult, columnsResult, countsResult] = await Promise.all([
    db.query<{
      profileId: string;
      displayName: string;
    }>(
      `
        select
          p.id as "profileId",
          p.display_name as "displayName"
        from home_tasks.household_members hm
        join home_tasks.profiles p on p.id = hm.profile_id
        where hm.household_id = $1
        order by p.display_name
      `,
      [context.householdId],
    ),
    db.query<{
      taskTemplateId: string;
      name: string;
      icon: string | null;
    }>(
      `
        select
          tt.id as "taskTemplateId",
          tt.name,
          tt.icon
        from home_tasks.task_completions tc
        join home_tasks.task_templates tt on tt.id = tc.task_template_id
        where tc.household_id = $1
          and tc.undone_at is null
          and tc.completed_at >= date_trunc('month', now())
        group by tt.id, tt.name, tt.icon
        order by tt.name
      `,
      [context.householdId],
    ),
    db.query<{
      profileId: string;
      taskTemplateId: string;
      count: number;
    }>(
      `
        select
          tc.completed_by as "profileId",
          tc.task_template_id as "taskTemplateId",
          count(*)::int as count
        from home_tasks.task_completions tc
        where tc.household_id = $1
          and tc.undone_at is null
          and tc.completed_at >= date_trunc('month', now())
        group by tc.completed_by, tc.task_template_id
      `,
      [context.householdId],
    ),
  ]);

  const countsByProfile = new Map<string, Record<string, number>>();

  for (const item of countsResult.rows) {
    const profileCounts = countsByProfile.get(item.profileId) ?? {};
    profileCounts[item.taskTemplateId] = item.count;
    countsByProfile.set(item.profileId, profileCounts);
  }

  return {
    columns: columnsResult.rows,
    rows: membersResult.rows.map((member) => {
      const counts = countsByProfile.get(member.profileId) ?? {};
      return {
        ...member,
        counts,
        total: Object.values(counts).reduce((sum, count) => sum + count, 0),
      };
    }),
  };
}
