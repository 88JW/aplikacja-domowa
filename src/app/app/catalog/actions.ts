"use server";

import { db } from "@/lib/db";
import { ensureHomeContext } from "@/lib/home";
import { requireSsoUser } from "@/lib/sso";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const attributeSchema = z.object({
  name: z.string().trim().min(2).max(60),
  icon: z.string().trim().max(12).optional(),
  kind: z.enum(["space", "activity"]),
});

const taskSchema = z.object({
  name: z.string().trim().min(2).max(100),
  icon: z.string().trim().max(12).optional(),
  attributeIds: z.array(z.string().uuid()).min(1).max(8),
});

export async function createTaskAttribute(formData: FormData) {
  const user = await requireSsoUser();
  const context = await ensureHomeContext(user);
  const values = attributeSchema.parse({
    name: formData.get("name"),
    icon: formData.get("icon") || undefined,
    kind: formData.get("kind"),
  });
  const code = values.name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (!code) {
    throw new Error("Nie udało się utworzyć kodu cechy.");
  }

  await db.query(
    `
      insert into home_tasks.task_attributes (
        household_id,
        code,
        name,
        icon,
        kind,
        sort_order
      )
      values (
        $1,
        $2,
        $3,
        $4,
        $5,
        coalesce((
          select max(sort_order) + 10
          from home_tasks.task_attributes
          where household_id = $1 and kind = $5
        ), 10)
      )
      on conflict (household_id, kind, code) do update
      set
        name = excluded.name,
        icon = coalesce(excluded.icon, home_tasks.task_attributes.icon)
    `,
    [
      context.householdId,
      code,
      values.name,
      values.icon ?? null,
      values.kind,
    ],
  );

  revalidatePath("/app/catalog");
}

export async function createTaskTemplate(formData: FormData) {
  const user = await requireSsoUser();
  const context = await ensureHomeContext(user);
  const values = taskSchema.parse({
    name: formData.get("name"),
    icon: formData.get("icon") || undefined,
    attributeIds: formData.getAll("attributeIds"),
  });
  const client = await db.connect();

  try {
    await client.query("begin");
    const result = await client.query<{ id: string }>(
      `
        insert into home_tasks.task_templates (
          household_id,
          name,
          icon,
          created_by
        )
        values ($1, $2, $3, $4)
        on conflict (household_id, name) do update
        set
          category_id = null,
          icon = coalesce(excluded.icon, home_tasks.task_templates.icon),
          archived_at = null
        returning id
      `,
      [
        context.householdId,
        values.name,
        values.icon ?? null,
        context.profileId,
      ],
    );

    if (!result.rows[0]) {
      throw new Error("Nie udało się dodać zadania.");
    }

    await client.query(
      `
        delete from home_tasks.task_template_attributes
        where task_template_id = $1
      `,
      [result.rows[0].id],
    );
    await client.query(
      `
        insert into home_tasks.task_template_attributes (
          task_template_id,
          attribute_id
        )
        select $1, a.id
        from home_tasks.task_attributes a
        where a.household_id = $2
          and a.id = any($3::uuid[])
        on conflict do nothing
      `,
      [result.rows[0].id, context.householdId, values.attributeIds],
    );
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }

  revalidatePath("/app/catalog");
  revalidatePath("/app/plan");
}

const archiveSchema = z.object({
  taskTemplateId: z.string().uuid(),
});

export async function archiveTaskTemplate(formData: FormData) {
  const user = await requireSsoUser();
  const context = await ensureHomeContext(user);
  const { taskTemplateId } = archiveSchema.parse({
    taskTemplateId: formData.get("taskTemplateId"),
  });

  await db.query(
    `
      update home_tasks.task_templates
      set archived_at = now()
      where id = $1 and household_id = $2
    `,
    [taskTemplateId, context.householdId],
  );

  await db.query(
    `
      update home_tasks.recurring_task_rules
      set active = false
      where task_template_id = $1 and household_id = $2
    `,
    [taskTemplateId, context.householdId],
  );

  revalidatePath("/app/catalog");
  revalidatePath("/app/plan");
  revalidatePath("/app/catalog/hidden");
}

export async function restoreTaskTemplate(formData: FormData) {
  const user = await requireSsoUser();
  const context = await ensureHomeContext(user);
  const { taskTemplateId } = archiveSchema.parse({
    taskTemplateId: formData.get("taskTemplateId"),
  });

  const result = await db.query(
    `
      update home_tasks.task_templates
      set archived_at = null
      where id = $1
        and household_id = $2
        and archived_at is not null
      returning id
    `,
    [taskTemplateId, context.householdId],
  );

  if (result.rowCount !== 1) {
    throw new Error("Zadanie nie istnieje albo zostało już przywrócone.");
  }

  revalidatePath("/app/catalog");
  revalidatePath("/app/catalog/hidden");
  revalidatePath("/app/plan");
}

const updateTaskSchema = taskSchema.extend({
  taskTemplateId: z.string().uuid(),
});

export async function updateTaskTemplate(formData: FormData) {
  const user = await requireSsoUser();
  const context = await ensureHomeContext(user);
  const values = updateTaskSchema.parse({
    taskTemplateId: formData.get("taskTemplateId"),
    name: formData.get("name"),
    icon: formData.get("icon") || undefined,
    attributeIds: formData.getAll("attributeIds"),
  });
  const client = await db.connect();

  try {
    await client.query("begin");
    const result = await client.query<{ id: string }>(
      `
        update home_tasks.task_templates tt
        set
          name = $1,
          icon = $2,
          category_id = null
        where tt.id = $3
          and tt.household_id = $4
        returning tt.id
      `,
      [
        values.name,
        values.icon ?? null,
        values.taskTemplateId,
        context.householdId,
      ],
    );

    if (!result.rows[0]) {
      throw new Error("Nie udało się zaktualizować zadania.");
    }

    await client.query(
      `
        delete from home_tasks.task_template_attributes
        where task_template_id = $1
      `,
      [values.taskTemplateId],
    );
    await client.query(
      `
        insert into home_tasks.task_template_attributes (
          task_template_id,
          attribute_id
        )
        select $1, a.id
        from home_tasks.task_attributes a
        where a.household_id = $2
          and a.id = any($3::uuid[])
        on conflict do nothing
      `,
      [values.taskTemplateId, context.householdId, values.attributeIds],
    );
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }

  revalidatePath("/app/catalog");
  revalidatePath(`/app/catalog/${values.taskTemplateId}`);
  revalidatePath("/app/plan");
}
