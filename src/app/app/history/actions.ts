"use server";

import { db } from "@/lib/db";
import { evaluateAchievements } from "@/lib/achievements";
import { queueAchievementCelebration } from "@/lib/celebration";
import { ensureHomeContext } from "@/lib/home";
import { requireSsoUser } from "@/lib/sso";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const deleteSchema = z.object({
  completionId: z.string().uuid(),
});

export async function deleteCompletion(formData: FormData) {
  const user = await requireSsoUser();
  const context = await ensureHomeContext(user);
  const { completionId } = deleteSchema.parse({
    completionId: formData.get("completionId"),
  });
  const client = await db.connect();

  try {
    await client.query("begin");
    const completion = await client.query<{
      planned_task_id: string | null;
      completed_by: string;
    }>(
      `
        update home_tasks.task_completions
        set undone_at = now()
        where id = $1
          and household_id = $2
          and undone_at is null
        returning planned_task_id, completed_by
      `,
      [completionId, context.householdId],
    );

    if (!completion.rows[0]) {
      throw new Error("Wpis nie istnieje albo został już usunięty.");
    }

    if (completion.rows[0].planned_task_id) {
      await client.query(
        `
          update home_tasks.planned_tasks
          set status = 'todo', completed_at = null
          where id = $1 and household_id = $2
        `,
        [completion.rows[0].planned_task_id, context.householdId],
      );
    }

    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }

  const completionOwner = await db.query<{
    profileId: string;
    displayName: string;
  }>(
    `
      select
        tc.completed_by as "profileId",
        p.display_name as "displayName"
      from home_tasks.task_completions tc
      join home_tasks.profiles p on p.id = tc.completed_by
      where tc.id = $1 and tc.household_id = $2
    `,
    [completionId, context.householdId],
  );

  if (completionOwner.rows[0]) {
    await evaluateAchievements({
      ...context,
      profileId: completionOwner.rows[0].profileId,
      profileDisplayName: completionOwner.rows[0].displayName,
    });
  }
  revalidatePath("/app");
  revalidatePath("/app/achievements");
  revalidatePath("/app/history");
  revalidatePath("/app/ranking");
  revalidatePath("/app/missions");
  revalidatePath("/app/map");
  revalidatePath("/tablet");
}

export async function restoreCompletion(formData: FormData) {
  const user = await requireSsoUser();
  const context = await ensureHomeContext(user);
  const { completionId } = deleteSchema.parse({
    completionId: formData.get("completionId"),
  });
  const client = await db.connect();
  let restoredOwner: { profileId: string; displayName: string } | null = null;

  try {
    await client.query("begin");
    const completion = await client.query<{
      planned_task_id: string | null;
      completed_at: Date;
      profile_id: string;
      display_name: string;
    }>(
      `
        update home_tasks.task_completions tc
        set undone_at = null
        from home_tasks.profiles p
        where tc.id = $1
          and tc.household_id = $2
          and tc.undone_at is not null
          and p.id = tc.completed_by
          and (
            tc.planned_task_id is null
            or not exists (
              select 1
              from home_tasks.task_completions active
              where active.planned_task_id = tc.planned_task_id
                and active.id <> tc.id
                and active.undone_at is null
            )
          )
        returning
          tc.planned_task_id,
          tc.completed_at,
          tc.completed_by as profile_id,
          p.display_name
      `,
      [completionId, context.householdId],
    );

    if (!completion.rows[0]) {
      throw new Error(
        "Nie można przywrócić wpisu. Zadanie mogło zostać wykonane ponownie.",
      );
    }

    if (completion.rows[0].planned_task_id) {
      await client.query(
        `
          update home_tasks.planned_tasks
          set status = 'completed', completed_at = $3
          where id = $1 and household_id = $2
        `,
        [
          completion.rows[0].planned_task_id,
          context.householdId,
          completion.rows[0].completed_at,
        ],
      );
    }

    restoredOwner = {
      profileId: completion.rows[0].profile_id,
      displayName: completion.rows[0].display_name,
    };
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }

  if (restoredOwner) {
    const earnedAchievements = await evaluateAchievements({
      ...context,
      profileId: restoredOwner.profileId,
      profileDisplayName: restoredOwner.displayName,
    });
    if (earnedAchievements.length > 0) {
      await queueAchievementCelebration(
        earnedAchievements[0].name,
        earnedAchievements[0].icon,
        earnedAchievements.length - 1,
      );
    }
  }

  revalidatePath("/app");
  revalidatePath("/app/achievements");
  revalidatePath("/app/history");
  revalidatePath("/app/ranking");
  revalidatePath("/app/missions");
  revalidatePath("/app/map");
  revalidatePath("/tablet");
}
