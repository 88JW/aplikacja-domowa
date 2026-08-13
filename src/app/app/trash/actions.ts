"use server";

import { db } from "@/lib/db";
import { ensureHomeContext } from "@/lib/home";
import { requireSsoUser } from "@/lib/sso";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const bagSchema = z.number().int().min(1).max(8);
const collectionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  kind: z.enum(["all", "bio_residual"]),
});

export async function toggleWasteBag(bagNumber: number, month: string) {
  const user = await requireSsoUser();
  const context = await ensureHomeContext(user);
  const bag = bagSchema.parse(bagNumber);
  const start = z.string().regex(/^\d{4}-\d{2}-01$/).parse(month);
  const removed = await db.query(
    `delete from home_tasks.waste_bag_outings
     where household_id = $1 and month_start = $2::date and bag_number = $3
     returning id`,
    [context.householdId, start, bag],
  );

  if (removed.rowCount === 0) {
    await db.query(
      `insert into home_tasks.waste_bag_outings
        (household_id, month_start, bag_number, marked_by)
       values ($1, $2::date, $3, $4)`,
      [context.householdId, start, bag, context.profileId],
    );
  }
  revalidatePath("/app/trash");
}

export async function setWasteCollection(date: string, kind: "all" | "bio_residual") {
  const user = await requireSsoUser();
  const context = await ensureHomeContext(user);
  const values = collectionSchema.parse({ date, kind });
  await db.query(
    `insert into home_tasks.waste_collection_days
      (household_id, collection_date, collection_kind, created_by)
     values ($1, $2::date, $3, $4)
     on conflict (household_id, collection_date) do update
       set collection_kind = excluded.collection_kind,
           created_by = excluded.created_by`,
    [context.householdId, values.date, values.kind, context.profileId],
  );
  revalidatePath("/app/trash");
}

export async function removeWasteCollection(date: string) {
  const user = await requireSsoUser();
  const context = await ensureHomeContext(user);
  const validDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(date);
  await db.query(
    `delete from home_tasks.waste_collection_days
     where household_id = $1 and collection_date = $2::date`,
    [context.householdId, validDate],
  );
  revalidatePath("/app/trash");
}
