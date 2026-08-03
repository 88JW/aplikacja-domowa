"use server";

import { db } from "@/lib/db";
import { ACTIVE_PROFILE_COOKIE, ensureHomeContext } from "@/lib/home";
import { requireSsoUser } from "@/lib/sso";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

const switchProfileSchema = z.object({
  profileId: z.string().uuid(),
  returnTo: z
    .string()
    .regex(/^(?:\/app(?:\/.*)?|\/tablet)$/)
    .default("/app"),
});

export async function switchActiveProfile(formData: FormData) {
  const user = await requireSsoUser();
  const context = await ensureHomeContext(user);
  const values = switchProfileSchema.parse({
    profileId: formData.get("profileId"),
    returnTo: formData.get("returnTo") || "/app",
  });
  const membership = await db.query(
    `
      select 1
      from home_tasks.household_members
      where household_id = $1 and profile_id = $2
    `,
    [context.householdId, values.profileId],
  );

  if (!membership.rows[0]) {
    throw new Error("Wybrany profil nie należy do tego domu.");
  }

  (await cookies()).set(ACTIVE_PROFILE_COOKIE, values.profileId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  redirect(values.returnTo);
}
