import { db } from "@/lib/db";
import { ensureHomeContext } from "@/lib/home";
import { requireSsoUser } from "@/lib/sso";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const subscriptionSchema = z.object({
  endpoint: z.url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export async function POST(request: NextRequest) {
  const user = await requireSsoUser();
  const context = await ensureHomeContext(user);
  const subscription = subscriptionSchema.parse(await request.json());

  await db.query(
    `
      insert into home_tasks.push_subscriptions (
        profile_id,
        endpoint,
        p256dh,
        auth,
        user_agent
      )
      values ($1, $2, $3, $4, $5)
      on conflict (endpoint) do update
      set
        profile_id = excluded.profile_id,
        p256dh = excluded.p256dh,
        auth = excluded.auth,
        user_agent = excluded.user_agent,
        failure_count = 0,
        updated_at = now()
    `,
    [
      context.profileId,
      subscription.endpoint,
      subscription.keys.p256dh,
      subscription.keys.auth,
      request.headers.get("user-agent"),
    ],
  );

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const user = await requireSsoUser();
  const context = await ensureHomeContext(user);
  const values = z
    .object({ endpoint: z.url() })
    .parse(await request.json());

  await db.query(
    `
      delete from home_tasks.push_subscriptions
      where profile_id = $1 and endpoint = $2
    `,
    [context.profileId, values.endpoint],
  );

  return NextResponse.json({ ok: true });
}
