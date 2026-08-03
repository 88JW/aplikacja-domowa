import { db } from "@/lib/db";
import type { HomeContext } from "@/lib/home";

export type NotificationItem = {
  id: string;
  title: string;
  body: string;
  href: string;
  readAt: Date | null;
  createdAt: Date;
  actorName: string | null;
};

export async function getUnreadNotificationCount(context: HomeContext) {
  const result = await db.query<{ count: number }>(
    `
      select count(*)::int as count
      from home_tasks.notifications
      where household_id = $1
        and recipient_profile_id = $2
        and read_at is null
    `,
    [context.householdId, context.profileId],
  );

  return result.rows[0]?.count ?? 0;
}

export async function getNotifications(context: HomeContext, limit = 50) {
  const result = await db.query<NotificationItem>(
    `
      select
        n.id,
        n.title,
        n.body,
        n.href,
        n.read_at as "readAt",
        n.created_at as "createdAt",
        actor.display_name as "actorName"
      from home_tasks.notifications n
      left join home_tasks.profiles actor on actor.id = n.actor_profile_id
      where n.household_id = $1
        and n.recipient_profile_id = $2
      order by n.created_at desc
      limit $3
    `,
    [context.householdId, context.profileId, limit],
  );

  return result.rows;
}
