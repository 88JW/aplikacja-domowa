import { db } from "@/lib/db";
import { ensureHomeContext } from "@/lib/home";
import { sendPushForNotifications } from "@/lib/push";
import { requireSsoUser } from "@/lib/sso";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export async function POST(request: NextRequest) {
  const user = await requireSsoUser();
  const context = await ensureHomeContext(user, { useActiveProfile: false });
  const body = await request.text();
  const { endpoint } = z.object({ endpoint: z.url().optional() })
    .parse(body ? JSON.parse(body) : {});
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

  const delivery = await sendPushForNotifications([result.rows[0].id], endpoint);
  if (!delivery.configured) {
    return NextResponse.json(
      { error: "Serwer powiadomień nie jest skonfigurowany." }, { status: 503 },
    );
  }
  if (delivery.attempted === 0) {
    return NextResponse.json(
      { error: "Urządzenie nie jest zapisane do powiadomień. Włącz je na tym telefonie." },
      { status: 409 },
    );
  }
  if (delivery.sent === 0) {
    return NextResponse.json(
      { error: delivery.expired > 0
        ? "Zapis urządzenia wygasł. Wyłącz i ponownie włącz powiadomienia."
        : "Usługa push nie przyjęła testu. Spróbuj ponownie za chwilę." },
      { status: 502 },
    );
  }
  return NextResponse.json({ ok: true, sent: delivery.sent });
}
