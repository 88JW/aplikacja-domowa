import { db } from "@/lib/db";
import webPush from "web-push";

type PushRecipient = {
  notificationId: string;
  title: string;
  body: string;
  href: string;
  subscriptionId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

function getVapidDetails() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!publicKey || !privateKey) {
    return null;
  }

  return {
    subject: process.env.VAPID_SUBJECT ?? "mailto:admin@miasoftware.pl",
    publicKey,
    privateKey,
  };
}

export async function sendPushForNotifications(notificationIds: string[]) {
  const vapidDetails = getVapidDetails();

  if (!vapidDetails || notificationIds.length === 0) {
    return;
  }

  const result = await db.query<PushRecipient>(
    `
      select
        n.id as "notificationId",
        n.title,
        n.body,
        n.href,
        ps.id as "subscriptionId",
        ps.endpoint,
        ps.p256dh,
        ps.auth
      from home_tasks.notifications n
      join home_tasks.push_subscriptions ps
        on ps.profile_id = n.recipient_profile_id
      where n.id = any($1::uuid[])
    `,
    [notificationIds],
  );

  await Promise.all(
    result.rows.map(async (recipient) => {
      try {
        await webPush.sendNotification(
          {
            endpoint: recipient.endpoint,
            keys: {
              p256dh: recipient.p256dh,
              auth: recipient.auth,
            },
          },
          JSON.stringify({
            title: recipient.title,
            body: recipient.body,
            url: recipient.href,
            notificationId: recipient.notificationId,
          }),
          {
            TTL: 60 * 60 * 24,
            urgency: "normal",
            topic: `homeapp-${recipient.notificationId.slice(0, 16)}`,
            vapidDetails,
          },
        );

        await db.query(
          `
            update home_tasks.push_subscriptions
            set
              failure_count = 0,
              last_success_at = now(),
              updated_at = now()
            where id = $1
          `,
          [recipient.subscriptionId],
        );
      } catch (error) {
        const statusCode =
          typeof error === "object" && error !== null && "statusCode" in error
            ? Number(error.statusCode)
            : null;

        if (statusCode === 404 || statusCode === 410) {
          await db.query(
            "delete from home_tasks.push_subscriptions where id = $1",
            [recipient.subscriptionId],
          );
          return;
        }

        await db.query(
          `
            update home_tasks.push_subscriptions
            set failure_count = failure_count + 1, updated_at = now()
            where id = $1
          `,
          [recipient.subscriptionId],
        );
      }
    }),
  );
}
