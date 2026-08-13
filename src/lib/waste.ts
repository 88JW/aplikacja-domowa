import { db } from "@/lib/db";
import type { HomeContext } from "@/lib/home";

export type WasteCollectionKind = "all" | "bio_residual";

export type WasteCollectionDay = {
  date: string;
  kind: WasteCollectionKind;
};

export async function getWasteData(context: HomeContext, monthStart: string) {
  const [bags, collections] = await Promise.all([
    db.query<{ bag_number: number }>(
      `select bag_number from home_tasks.waste_bag_outings
       where household_id = $1 and month_start = $2::date`,
      [context.householdId, monthStart],
    ),
    db.query<{ collection_date: string; collection_kind: WasteCollectionKind }>(
      `select collection_date::text, collection_kind
       from home_tasks.waste_collection_days
       where household_id = $1
         and collection_date >= $2::date
         and collection_date < ($2::date + interval '1 month')
       order by collection_date`,
      [context.householdId, monthStart],
    ),
  ]);

  return {
    markedBags: bags.rows.map((bag) => bag.bag_number),
    collections: collections.rows.map((item) => ({
      date: item.collection_date,
      kind: item.collection_kind,
    })),
  };
}
