import { db } from "@/lib/db";
import { ensureHomeContext } from "@/lib/home";
import { sendPushForNotifications } from "@/lib/push";
import { requireSsoUser } from "@/lib/sso";
import { NextResponse } from "next/server";

export async function POST() {
  const user = await requireSsoUser();
  const context = await ensureHomeContext(user);
  const result = await db.query<{ id: string }>(
    `
      insert into home_tasks.notifications (
        household_id,
        recipient_profile_id,
        actor_profile_id,
        notification_type,
        title,
        body,
        href
      )
      values (
        $1,
        $2,
        $2,
        'push_test',
        'Test powiadomień HomeApp',
        'Powiadomienia PWA działają na tym urządzeniu.',
        '/app/notifications'
      )
      returning id
    `,
    [context.householdId, context.profileId],
  );

  await sendPushForNotifications([result.rows[0].id]);
  return NextResponse.json({ ok: true });
}
