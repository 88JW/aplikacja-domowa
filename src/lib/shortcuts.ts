import { db } from "@/lib/db";
import type { HomeContext } from "@/lib/home";

export type TaskShortcut = {
  taskTemplateId: string;
  name: string;
  icon: string | null;
  attributes: Array<{
    name: string;
    icon: string | null;
    kind: "space" | "activity";
  }>;
};

export async function getTaskShortcuts(context: HomeContext) {
  const [shortcutsResult, tasksResult] = await Promise.all([
    db.query<TaskShortcut>(
      `
        select
          tt.id as "taskTemplateId",
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
          ), '[]'::jsonb) as attributes
        from home_tasks.profile_task_shortcuts s
        join home_tasks.task_templates tt on tt.id = s.task_template_id
        where s.profile_id = $1
          and tt.household_id = $2
          and tt.archived_at is null
        order by s.sort_order, s.created_at, tt.name
      `,
      [context.profileId, context.householdId],
    ),
    db.query<TaskShortcut>(
      `
        select
          tt.id as "taskTemplateId",
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
          ), '[]'::jsonb) as attributes
        from home_tasks.task_templates tt
        where tt.household_id = $1
          and tt.archived_at is null
        order by tt.name
      `,
      [context.householdId],
    ),
  ]);

  return {
    shortcuts: shortcutsResult.rows,
    available: tasksResult.rows.filter(
      (task) =>
        !shortcutsResult.rows.some(
          (shortcut) => shortcut.taskTemplateId === task.taskTemplateId,
        ),
    ),
    tasks: tasksResult.rows,
  };
}
