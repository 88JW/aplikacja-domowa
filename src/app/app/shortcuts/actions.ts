"use server";

import { evaluateAchievements } from "@/lib/achievements";
import { db } from "@/lib/db";
import { ensureHomeContext } from "@/lib/home";
import { requireSsoUser } from "@/lib/sso";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  queueAchievementCelebration,
  queueTaskCelebration,
} from "@/lib/celebration";

const shortcutSchema = z.object({
  taskTemplateId: z.string().uuid(),
});

export async function addTaskShortcut(formData: FormData) {
  const user = await requireSsoUser();
  const context = await ensureHomeContext(user);
  const { taskTemplateId } = shortcutSchema.parse({
    taskTemplateId: formData.get("taskTemplateId"),
  });

  await db.query(
    `
      insert into home_tasks.profile_task_shortcuts (
        profile_id,
        task_template_id,
        sort_order
      )
      select
        $2,
        tt.id,
        coalesce((
          select max(sort_order) + 1
          from home_tasks.profile_task_shortcuts
          where profile_id = $2
        ), 0)
      from home_tasks.task_templates tt
      where tt.id = $1
        and tt.household_id = $3
        and tt.archived_at is null
      on conflict do nothing
    `,
    [taskTemplateId, context.profileId, context.householdId],
  );

  revalidatePath("/app");
}

export async function removeTaskShortcut(formData: FormData) {
  const user = await requireSsoUser();
  const context = await ensureHomeContext(user);
  const { taskTemplateId } = shortcutSchema.parse({
    taskTemplateId: formData.get("taskTemplateId"),
  });

  await db.query(
    `
      delete from home_tasks.profile_task_shortcuts
      where profile_id = $1 and task_template_id = $2
    `,
    [context.profileId, taskTemplateId],
  );

  revalidatePath("/app");
}

export async function completeTaskShortcut(formData: FormData) {
  const user = await requireSsoUser();
  const context = await ensureHomeContext(user);
  const { taskTemplateId } = shortcutSchema.parse({
    taskTemplateId: formData.get("taskTemplateId"),
  });

  const result = await db.query(
    `
      insert into home_tasks.task_completions (
        household_id,
        task_template_id,
        completed_by
      )
      select $3, tt.id, $1
      from home_tasks.profile_task_shortcuts s
      join home_tasks.task_templates tt on tt.id = s.task_template_id
      where s.profile_id = $1
        and s.task_template_id = $2
        and tt.household_id = $3
        and tt.archived_at is null
      returning id
    `,
    [context.profileId, taskTemplateId, context.householdId],
  );

  if (result.rowCount !== 1) {
    throw new Error("Skrót nie istnieje albo zadanie jest niedostępne.");
  }

  const earnedAchievements = await evaluateAchievements(context);
  if (earnedAchievements[0]) {
    await queueAchievementCelebration(
      earnedAchievements[0].name,
      earnedAchievements[0].icon,
      earnedAchievements.length - 1,
    );
  } else {
    await queueTaskCelebration(context.profileDisplayName);
  }
  revalidatePath("/app");
  revalidatePath("/app/history");
  revalidatePath("/app/ranking");
  revalidatePath("/app/achievements");
  revalidatePath("/app/missions");
  revalidatePath("/tablet");
}
