"use server";

import { db } from "@/lib/db";
import { ensureHomeContext } from "@/lib/home";
import { requireSsoUser } from "@/lib/sso";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const notificationSchema = z.object({
  notificationId: z.string().uuid(),
});

export async function markNotificationRead(formData: FormData) {
  const user = await requireSsoUser();
  const context = await ensureHomeContext(user);
  const { notificationId } = notificationSchema.parse({
    notificationId: formData.get("notificationId"),
  });

  await db.query(
    `
      update home_tasks.notifications
      set read_at = coalesce(read_at, now())
      where id = $1
        and household_id = $2
        and recipient_profile_id = $3
    `,
    [notificationId, context.householdId, context.profileId],
  );

  revalidatePath("/app/notifications");
  revalidatePath("/app", "layout");
}

export async function markAllNotificationsRead() {
  const user = await requireSsoUser();
  const context = await ensureHomeContext(user);

  await db.query(
    `
      update home_tasks.notifications
      set read_at = now()
      where household_id = $1
        and recipient_profile_id = $2
        and read_at is null
    `,
    [context.householdId, context.profileId],
  );

  revalidatePath("/app/notifications");
  revalidatePath("/app", "layout");
}
