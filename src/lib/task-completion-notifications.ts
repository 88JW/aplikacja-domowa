import type { PoolClient } from "pg";
import type { HomeContext } from "@/lib/home";
import { sendPushForNotifications } from "@/lib/push";

// Save the alert with the completion; send push only after the transaction commits.
export async function createTaskCompletionNotifications(
  client: PoolClient,
  context: HomeContext,
  completionId: string,
) {
  const result = await client.query<{ id: string }>(
    `
      insert into home_tasks.notifications (
        household_id,
        recipient_profile_id,
        actor_profile_id,
        planned_task_id,
        notification_type,
        title,
        body,
        href,
        dedupe_key
      )
      select
        tc.household_id,
        hm.profile_id,
        tc.completed_by,
        tc.planned_task_id,
        'task_completed',
        actor.display_name || ' — wykonane zadanie',
        actor.display_name || ' — wykonane: „' || tt.name || '”.',
        '/app/history',
        'task-completed:' || tc.id::text
      from home_tasks.task_completions tc
      join home_tasks.task_templates tt
        on tt.id = tc.task_template_id and tt.household_id = tc.household_id
      join home_tasks.profiles actor on actor.id = tc.completed_by
      join home_tasks.household_members hm on hm.household_id = tc.household_id
      where tc.id = $1
        and tc.household_id = $2
        and tc.completed_by = $3
        and tc.undone_at is null
        and hm.profile_id <> tc.completed_by
      on conflict do nothing
      returning id
    `,
    [completionId, context.householdId, context.profileId],
  );

  return result.rows.map((notification) => notification.id);
}

export async function deliverTaskCompletionNotifications(notificationIds: string[]) {
  try {
    await sendPushForNotifications(notificationIds);
  } catch {
    // A push outage must not turn a saved completion into an apparent failure.
    console.error("Nie udało się wysłać push o wykonaniu zadania.");
  }
}
