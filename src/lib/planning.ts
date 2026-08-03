import { db } from "@/lib/db";
import type { HomeContext } from "@/lib/home";

export type TaskTemplateOption = {
  id: string;
  name: string;
  icon: string | null;
  attributes: TaskAttributeOption[];
};

export type TaskAttributeOption = {
  id: string;
  code: string;
  name: string;
  icon: string | null;
  kind: "space" | "activity";
};

export type HouseholdMemberOption = {
  id: string;
  displayName: string;
  email: string;
};

export type PlannedTaskItem = {
  id: string;
  name: string;
  icon: string | null;
  attributes: TaskAttributeOption[];
  assignedToName: string | null;
  status: string;
};

export async function getPlanningOptions(context: HomeContext) {
  const [templates, members, attributes] = await Promise.all([
    db.query<TaskTemplateOption>(
      `
        select
          tt.id,
          tt.name,
          tt.icon,
          coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'id', a.id,
                'code', a.code,
                'name', a.name,
                'icon', a.icon,
                'kind', a.kind
              )
              order by a.kind desc, a.sort_order, a.name
            )
            from home_tasks.task_template_attributes tta
            join home_tasks.task_attributes a on a.id = tta.attribute_id
            where tta.task_template_id = tt.id
          ), '[]'::jsonb) as attributes
        from home_tasks.task_templates tt
        where tt.household_id = $1 and tt.archived_at is null
        order by tt.name
      `,
      [context.householdId],
    ),
    db.query<HouseholdMemberOption>(
      `
        select
          p.id,
          p.display_name as "displayName",
          p.email
        from home_tasks.household_members hm
        join home_tasks.profiles p on p.id = hm.profile_id
        where hm.household_id = $1
        order by p.display_name
      `,
      [context.householdId],
    ),
    db.query<TaskAttributeOption>(
      `
        select id, code, name, icon, kind
        from home_tasks.task_attributes
        where household_id = $1
        order by kind desc, sort_order, name
      `,
      [context.householdId],
    ),
  ]);

  return {
    templates: templates.rows,
    members: members.rows,
    attributes: attributes.rows,
  };
}

export async function getPlannedTasksForDate(
  context: HomeContext,
  scheduledFor: string,
) {
  const result = await db.query<PlannedTaskItem>(
    `
      select
        pt.id,
        tt.name,
        tt.icon,
        coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'id', a.id,
              'code', a.code,
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
        p.display_name as "assignedToName",
        pt.status
      from home_tasks.planned_tasks pt
      join home_tasks.task_templates tt on tt.id = pt.task_template_id
      left join home_tasks.profiles p on p.id = pt.assigned_to
      where pt.household_id = $1 and pt.scheduled_for = $2::date
      order by pt.status = 'completed', pt.created_at
    `,
    [context.householdId, scheduledFor],
  );

  return result.rows;
}

export async function getTaskTemplate(
  context: HomeContext,
  taskTemplateId: string,
) {
  const result = await db.query<TaskTemplateOption>(
    `
      select
        tt.id,
        tt.name,
        tt.icon,
        coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'id', a.id,
              'code', a.code,
              'name', a.name,
              'icon', a.icon,
              'kind', a.kind
            )
            order by a.kind desc, a.sort_order, a.name
          )
          from home_tasks.task_template_attributes tta
          join home_tasks.task_attributes a on a.id = tta.attribute_id
          where tta.task_template_id = tt.id
        ), '[]'::jsonb) as attributes
      from home_tasks.task_templates tt
      where tt.id = $1
        and tt.household_id = $2
        and tt.archived_at is null
      limit 1
    `,
    [taskTemplateId, context.householdId],
  );

  return result.rows[0] ?? null;
}

export async function getArchivedTaskTemplates(context: HomeContext) {
  const result = await db.query<TaskTemplateOption>(
    `
      select
        tt.id,
        tt.name,
        tt.icon,
        coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'id', a.id,
              'code', a.code,
              'name', a.name,
              'icon', a.icon,
              'kind', a.kind
            )
            order by a.kind desc, a.sort_order, a.name
          )
          from home_tasks.task_template_attributes tta
          join home_tasks.task_attributes a on a.id = tta.attribute_id
          where tta.task_template_id = tt.id
        ), '[]'::jsonb) as attributes
      from home_tasks.task_templates tt
      where tt.household_id = $1 and tt.archived_at is not null
      order by tt.archived_at desc, tt.name
    `,
    [context.householdId],
  );

  return result.rows;
}
