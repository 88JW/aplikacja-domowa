"use server";

import { db } from "@/lib/db";
import { ensureHomeContext } from "@/lib/home";
import { requireSsoUser } from "@/lib/sso";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const profileSchema = z.object({
  displayName: z.string().trim().min(2).max(60),
});

export async function updateProfile(formData: FormData) {
  const user = await requireSsoUser();
  const context = await ensureHomeContext(user);
  const { displayName } = profileSchema.parse({
    displayName: formData.get("displayName"),
  });

  await db.query(
    `
      update home_tasks.profiles
      set display_name = $1, updated_at = now()
      where id = $2
    `,
    [displayName, context.profileId],
  );

  revalidatePath("/app");
  revalidatePath("/app/history");
  revalidatePath("/app/ranking");
  revalidatePath("/app/more");
}
