import { db } from "@/lib/db";
import type { HomeContext } from "@/lib/home";

export type HomeMapTask = {
  id: string;
  name: string;
  icon: string | null;
  assignedToName: string | null;
  spaceCodes: string[];
};

export type HomeMapArea = {
  code: string;
  name: string;
  icon: string;
  tasks: HomeMapTask[];
};

export type HomeMapLevel = {
  code: string;
  name: string;
  areas: HomeMapArea[];
};

const levelDefinitions = [
  {
    code: "ground",
    name: "Parter",
    areas: [
      ["kitchen", "Kuchnia", "🍽️"],
      ["ground_entry", "Przedsionek", "🚪"],
      ["ground_hall", "Przedpokój", "🧥"],
      ["ground_office", "Gabinet", "💻"],
      ["ground_bathroom", "Łazienka", "🚿"],
      ["ground_pantry", "Spiżarnia", "🥫"],
      ["living_room", "Salon", "🛋️"],
    ],
  },
  {
    code: "upper",
    name: "Piętro",
    areas: [
      ["upper_stairs", "Schody", "🪜"],
      ["upper_hall", "Korytarz", "🚶"],
      ["upper_wardrobe", "Garderoba", "👚"],
      ["upper_bathroom", "Łazienka", "🛁"],
      ["bedroom", "Sypialnia", "🛏️"],
      ["upper_bavarian_office", "Bawarski gabinet", "🖋️"],
    ],
  },
  {
    code: "garage",
    name: "Garaż",
    areas: [
      ["garage_main", "Garaż", "🚗"],
      ["garage_storage", "Schowek", "📦"],
    ],
  },
  {
    code: "garden",
    name: "Ogród",
    areas: [
      ["garden_front", "Front", "🌼"],
      ["garden_back", "Tył", "🌳"],
      ["garden_far_back", "Dalszy tył", "🌲"],
      ["garden_terrace", "Taras", "🪴"],
      ["garden_fruit", "Część owocowa", "🍎"],
      ["garden_vegetable", "Część warzywna", "🥕"],
      ["garden_andrzej", "Część Andrzeja", "🌻"],
    ],
  },
] as const;

export async function getHomeMap(context: HomeContext) {
  const result = await db.query<HomeMapTask>(
    `
      select
        pt.id,
        tt.name,
        tt.icon,
        p.display_name as "assignedToName",
        coalesce((
          select jsonb_agg(a.code order by a.sort_order, a.name)
          from home_tasks.task_template_attributes tta
          join home_tasks.task_attributes a on a.id = tta.attribute_id
          where tta.task_template_id = tt.id and a.kind = 'space'
        ), '[]'::jsonb) as "spaceCodes"
      from home_tasks.planned_tasks pt
      join home_tasks.task_templates tt on tt.id = pt.task_template_id
      left join home_tasks.profiles p on p.id = pt.assigned_to
      where pt.household_id = $1
        and pt.scheduled_for = current_date
        and pt.status in ('todo', 'in_progress')
      order by pt.created_at
    `,
    [context.householdId],
  );
  const knownCodes = new Set<string>(
    levelDefinitions.flatMap((level) => level.areas.map((area) => area[0])),
  );
  const levels: HomeMapLevel[] = levelDefinitions.map((level) => ({
    code: level.code,
    name: level.name,
    areas: level.areas.map(([code, name, icon]) => ({
      code,
      name,
      icon,
      tasks: result.rows.filter((task) => task.spaceCodes.includes(code)),
    })),
  }));
  const generalTasks = result.rows.filter(
    (task) =>
      task.spaceCodes.length === 0 ||
      !task.spaceCodes.some((code) => knownCodes.has(code)),
  );

  return { levels, generalTasks };
}
