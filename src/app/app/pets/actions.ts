"use server";
import { db } from "@/lib/db";
import { ensureHomeContext } from "@/lib/home";
import { requireSsoUser } from "@/lib/sso";
import { revalidatePath } from "next/cache";
import { z } from "zod";

async function context() { return ensureHomeContext(await requireSsoUser()); }
const idSchema = z.string().uuid();
export async function addPetTask(form: FormData) {
  const home = await context();
  const name = z.string().trim().min(1).max(100).parse(form.get("name"));
  const schedule = z.enum(["morning", "evening", "both", "manual"]).parse(form.get("schedule"));
  await db.query(`insert into home_tasks.pet_tasks (household_id, name, schedule, created_by) values ($1, $2, $3, $4)`, [home.householdId, name, schedule, home.profileId]);
  revalidatePath("/app/pets");
}
export async function addPetShortcut(form: FormData) {
  const home = await context();
  const id = idSchema.parse(form.get("id"));
  await db.query(`insert into home_tasks.pet_task_shortcuts (profile_id, task_id)
    select $2, id from home_tasks.pet_tasks where id = $1 and household_id = $3 and archived_at is null
    on conflict do nothing`, [id, home.profileId, home.householdId]);
  revalidatePath("/app/pets");
}
export async function removePetShortcut(form: FormData) {
  const home = await context();
  const id = idSchema.parse(form.get("id"));
  await db.query(`delete from home_tasks.pet_task_shortcuts where profile_id = $1 and task_id = $2`, [home.profileId, id]);
  revalidatePath("/app/pets");
}
export async function completePetShortcut(form: FormData) {
  const home = await context();
  const id = idSchema.parse(form.get("id"));
  const result = await db.query(`insert into home_tasks.pet_task_completions (task_id, completion_date, slot, completed_by)
    select t.id, (now() at time zone 'Europe/Warsaw')::date,
      case when t.schedule = 'both' then case when extract(hour from now() at time zone 'Europe/Warsaw') < 18 then 'morning' else 'evening' end else t.schedule end,
      $2 from home_tasks.pet_tasks t join home_tasks.pet_task_shortcuts s on s.task_id = t.id and s.profile_id = $2
    where t.id = $1 and t.household_id = $3 and t.archived_at is null
    on conflict (task_id, completion_date, slot) where slot <> 'extra' do nothing returning id`, [id, home.profileId, home.householdId]);
  if (result.rowCount === 0) {
    await db.query(`insert into home_tasks.pet_task_completions (task_id, completion_date, slot, completed_by)
      select t.id, (now() at time zone 'Europe/Warsaw')::date, 'extra', $2
      from home_tasks.pet_tasks t join home_tasks.pet_task_shortcuts s on s.task_id = t.id and s.profile_id = $2
      where t.id = $1 and t.household_id = $3 and t.archived_at is null`, [id, home.profileId, home.householdId]);
  }
  revalidatePath("/app/pets");
}
export async function removePetCompletion(form: FormData) {
  const home = await context();
  const id = idSchema.parse(form.get("id"));
  await db.query(`delete from home_tasks.pet_task_completions c using home_tasks.pet_tasks t
    where c.task_id = t.id and c.id = $1 and t.household_id = $2`, [id, home.householdId]);
  revalidatePath("/app/pets");
}
export async function archivePetTask(form: FormData) {
  const home = await context();
  const id = idSchema.parse(form.get("id"));
  await db.query(`update home_tasks.pet_tasks set archived_at = now() where id = $1 and household_id = $2 and archived_at is null`, [id, home.householdId]);
  revalidatePath("/app/pets");
}
