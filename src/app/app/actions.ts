"use server";

import { db } from "@/lib/db";
import { ensureHomeContext } from "@/lib/home";
import { evaluateAchievements } from "@/lib/achievements";
import { requireSsoUser } from "@/lib/sso";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createTaskCompletionNotifications,
  deliverTaskCompletionNotifications,
} from "@/lib/task-completion-notifications";
import {
  queueAchievementCelebration,
  queueTaskCelebration,
} from "@/lib/celebration";

const completeTaskSchema = z.object({
  plannedTaskId: z.string().uuid(),
});

const completeUnplannedTaskSchema = z.object({
  taskTemplateId: z.string().uuid(),
});

export async function completeTask(formData: FormData) {
  const user = await requireSsoUser();
  const { plannedTaskId } = completeTaskSchema.parse({
    plannedTaskId: formData.get("plannedTaskId"),
  });
  const context = await ensureHomeContext(user);
  const client = await db.connect();
  let notificationIds: string[] = [];

  try {
    await client.query("begin");

    const taskResult = await client.query<{ task_template_id: string }>(
      `
        update home_tasks.planned_tasks
        set status = 'completed', completed_at = now()
        where id = $1
          and household_id = $2
          and status in ('todo', 'in_progress')
          and (assigned_to is null or assigned_to = $3)
        returning task_template_id
      `,
      [plannedTaskId, context.householdId, context.profileId],
    );

    if (!taskResult.rows[0]) {
      throw new Error("Zadanie nie istnieje albo zostało już wykonane.");
    }

    const completion = await client.query<{ id: string }>(
      `
        insert into home_tasks.task_completions (
          household_id,
          task_template_id,
          planned_task_id,
          completed_by
        )
        values ($1, $2, $3, $4)
        returning id
      `,
      [
        context.householdId,
        taskResult.rows[0].task_template_id,
        plannedTaskId,
        context.profileId,
      ],
    );

    notificationIds = await createTaskCompletionNotifications(
      client,
      context,
      completion.rows[0].id,
    );
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }

  await deliverTaskCompletionNotifications(notificationIds);
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
  revalidatePath("/app/notifications");
  revalidatePath("/app", "layout");
  revalidatePath("/app/achievements");
  revalidatePath("/app/history");
  revalidatePath("/app/ranking");
  revalidatePath("/app/missions");
  revalidatePath("/app/map");
  revalidatePath("/tablet");
}

export async function completeUnplannedTask(formData: FormData) {
  const user = await requireSsoUser();
  const { taskTemplateId } = completeUnplannedTaskSchema.parse({
    taskTemplateId: formData.get("taskTemplateId"),
  });
  const context = await ensureHomeContext(user);

  const client = await db.connect();
  let notificationIds: string[] = [];

  try {
    await client.query("begin");
    const result = await client.query<{ id: string }>(
      `
        insert into home_tasks.task_completions (
          household_id,
          task_template_id,
          completed_by
        )
        select $2, tt.id, $3
        from home_tasks.task_templates tt
        where tt.id = $1
          and tt.household_id = $2
          and tt.archived_at is null
        returning id
      `,
      [taskTemplateId, context.householdId, context.profileId],
    );

    if (result.rowCount !== 1) {
      throw new Error("Zadanie nie istnieje albo jest niedostępne.");
    }

    notificationIds = await createTaskCompletionNotifications(
      client,
      context,
      result.rows[0].id,
    );
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }

  await deliverTaskCompletionNotifications(notificationIds);
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
  revalidatePath("/app/notifications");
  revalidatePath("/app", "layout");
  revalidatePath("/app/history");
  revalidatePath("/app/ranking");
  revalidatePath("/app/achievements");
  revalidatePath("/app/missions");
  revalidatePath("/tablet");
}
