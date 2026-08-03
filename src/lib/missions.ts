import { db } from "@/lib/db";
import type { HomeContext } from "@/lib/home";

export type MissionCheckpoint = {
  label: string;
  current: number;
  target: number;
};

export type SharedMission = {
  code: string;
  name: string;
  description: string;
  icon: string;
  periodLabel: string;
  checkpoints: MissionCheckpoint[];
  current: number;
  target: number;
  progress: number;
  completed: boolean;
};

function createMission(
  mission: Omit<SharedMission, "current" | "target" | "progress" | "completed">,
): SharedMission {
  const current = mission.checkpoints.reduce(
    (sum, checkpoint) => sum + Math.min(checkpoint.current, checkpoint.target),
    0,
  );
  const target = mission.checkpoints.reduce(
    (sum, checkpoint) => sum + checkpoint.target,
    0,
  );

  return {
    ...mission,
    current,
    target,
    progress: target === 0 ? 0 : Math.round((current / target) * 100),
    completed: mission.checkpoints.every(
      (checkpoint) => checkpoint.current >= checkpoint.target,
    ),
  };
}

function getSeasonDefinition() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "numeric",
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(now).map((part) => [part.type, part.value]),
  );
  const year = Number(parts.year);
  const month = Number(parts.month);

  if (month >= 3 && month <= 5) {
    return {
      code: "spring_refresh",
      name: "Wiosenne przebudzenie",
      description: "Razem przygotujcie dom i ogród na wiosnę.",
      icon: "🌷",
      label: "Wiosna",
      start: `${year}-03-01`,
      end: `${year}-06-01`,
      attributeCodes: ["garden", "tidying", "washing"],
      taskTarget: 20,
      spaceTarget: 4,
    };
  }

  if (month >= 6 && month <= 8) {
    return {
      code: "summer_garden",
      name: "Letnia ofensywa",
      description: "Wspólna sezonowa akcja w ogrodzie i na tarasie.",
      icon: "☀️",
      label: "Lato",
      start: `${year}-06-01`,
      end: `${year}-09-01`,
      attributeCodes: [
        "garden",
        "garden_front",
        "garden_back",
        "garden_far_back",
        "garden_terrace",
        "garden_fruit",
        "garden_vegetable",
        "garden_andrzej",
        "mowing",
      ],
      taskTarget: 20,
      spaceTarget: 3,
    };
  }

  if (month >= 9 && month <= 11) {
    return {
      code: "autumn_reset",
      name: "Jesienny reset",
      description: "Porządki, odpady i przygotowanie domu przed zimą.",
      icon: "🍂",
      label: "Jesień",
      start: `${year}-09-01`,
      end: `${year}-12-01`,
      attributeCodes: ["tidying", "waste", "garden"],
      taskTarget: 20,
      spaceTarget: 4,
    };
  }

  const winterStartYear = month <= 2 ? year - 1 : year;
  return {
    code: "winter_nest",
    name: "Zimowe gniazdo",
    description: "Wspólnie zadbajcie o przytulny dom w zimowym sezonie.",
    icon: "❄️",
    label: "Zima",
    start: `${winterStartYear}-12-01`,
    end: `${winterStartYear + 1}-03-01`,
    attributeCodes: ["whole_home", "living_room", "bedroom", "tidying"],
    taskTarget: 20,
    spaceTarget: 3,
  };
}

export async function getSharedMissions(
  context: HomeContext,
): Promise<SharedMission[]> {
  const season = getSeasonDefinition();
  const [membersResult, statsResult, seasonResult] = await Promise.all([
    db.query<{ profileId: string; displayName: string; weeklyCount: number }>(
      `
        select
          p.id as "profileId",
          p.display_name as "displayName",
          count(tc.id)::int as "weeklyCount"
        from home_tasks.household_members hm
        join home_tasks.profiles p on p.id = hm.profile_id
        left join home_tasks.task_completions tc
          on tc.household_id = hm.household_id
         and tc.completed_by = hm.profile_id
         and tc.undone_at is null
         and tc.completed_at >= date_trunc('week', now())
        where hm.household_id = $1
        group by p.id, p.display_name
        order by p.display_name
      `,
      [context.householdId],
    ),
    db.query<{
      weekendTasks: number;
      weekendSpaces: number;
      weekendMembers: number;
      bathroomTasks: number;
      bathroomKinds: number;
      bathroomMembers: number;
      petTasks: number;
      petMembers: number;
    }>(
      `
        select
          (
            select count(*)::int
            from home_tasks.task_completions tc
            where tc.household_id = $1
              and tc.undone_at is null
              and tc.completed_at >= date_trunc('week', now())
              and extract(isodow from tc.completed_at at time zone 'Europe/Warsaw') >= 5
          ) as "weekendTasks",
          (
            select count(distinct a.id)::int
            from home_tasks.task_completions tc
            join home_tasks.task_template_attributes tta
              on tta.task_template_id = tc.task_template_id
            join home_tasks.task_attributes a
              on a.id = tta.attribute_id and a.kind = 'space'
            where tc.household_id = $1
              and tc.undone_at is null
              and tc.completed_at >= date_trunc('week', now())
              and extract(isodow from tc.completed_at at time zone 'Europe/Warsaw') >= 5
          ) as "weekendSpaces",
          (
            select count(distinct tc.completed_by)::int
            from home_tasks.task_completions tc
            where tc.household_id = $1
              and tc.undone_at is null
              and tc.completed_at >= date_trunc('week', now())
              and extract(isodow from tc.completed_at at time zone 'Europe/Warsaw') >= 5
          ) as "weekendMembers",
          (
            select count(*)::int
            from home_tasks.task_completions tc
            where tc.household_id = $1
              and tc.undone_at is null
              and tc.completed_at >= date_trunc('month', now())
              and exists (
                select 1
                from home_tasks.task_template_attributes tta
                join home_tasks.task_attributes a on a.id = tta.attribute_id
                where tta.task_template_id = tc.task_template_id
                  and a.kind = 'space' and a.code = 'bathroom'
              )
          ) as "bathroomTasks",
          (
            select count(distinct tc.task_template_id)::int
            from home_tasks.task_completions tc
            where tc.household_id = $1
              and tc.undone_at is null
              and tc.completed_at >= date_trunc('month', now())
              and exists (
                select 1
                from home_tasks.task_template_attributes tta
                join home_tasks.task_attributes a on a.id = tta.attribute_id
                where tta.task_template_id = tc.task_template_id
                  and a.kind = 'space' and a.code = 'bathroom'
              )
          ) as "bathroomKinds",
          (
            select count(distinct tc.completed_by)::int
            from home_tasks.task_completions tc
            where tc.household_id = $1
              and tc.undone_at is null
              and tc.completed_at >= date_trunc('month', now())
              and exists (
                select 1
                from home_tasks.task_template_attributes tta
                join home_tasks.task_attributes a on a.id = tta.attribute_id
                where tta.task_template_id = tc.task_template_id
                  and a.kind = 'space' and a.code = 'bathroom'
              )
          ) as "bathroomMembers",
          (
            select count(*)::int
            from home_tasks.task_completions tc
            where tc.household_id = $1
              and tc.undone_at is null
              and tc.completed_at >= date_trunc('month', now())
              and exists (
                select 1
                from home_tasks.task_template_attributes tta
                join home_tasks.task_attributes a on a.id = tta.attribute_id
                where tta.task_template_id = tc.task_template_id
                  and a.kind = 'activity' and a.code = 'pet_care'
              )
          ) as "petTasks",
          (
            select count(distinct tc.completed_by)::int
            from home_tasks.task_completions tc
            where tc.household_id = $1
              and tc.undone_at is null
              and tc.completed_at >= date_trunc('month', now())
              and exists (
                select 1
                from home_tasks.task_template_attributes tta
                join home_tasks.task_attributes a on a.id = tta.attribute_id
                where tta.task_template_id = tc.task_template_id
                  and a.kind = 'activity' and a.code = 'pet_care'
              )
          ) as "petMembers"
      `,
      [context.householdId],
    ),
    db.query<{ taskCount: number; spaceCount: number; memberCount: number }>(
      `
        select
          count(distinct tc.id)::int as "taskCount",
          count(distinct space.id)::int as "spaceCount",
          count(distinct tc.completed_by)::int as "memberCount"
        from home_tasks.task_completions tc
        left join home_tasks.task_template_attributes space_tta
          on space_tta.task_template_id = tc.task_template_id
        left join home_tasks.task_attributes space
          on space.id = space_tta.attribute_id and space.kind = 'space'
        where tc.household_id = $1
          and tc.undone_at is null
          and tc.completed_at >= $2::date
          and tc.completed_at < $3::date
          and exists (
            select 1
            from home_tasks.task_template_attributes tta
            join home_tasks.task_attributes a on a.id = tta.attribute_id
            where tta.task_template_id = tc.task_template_id
              and a.code = any($4::text[])
          )
      `,
      [context.householdId, season.start, season.end, season.attributeCodes],
    ),
  ]);
  const stats = statsResult.rows[0];
  const seasonStats = seasonResult.rows[0];
  const memberTarget = Math.max(membersResult.rows.length, 1);

  return [
    createMission({
      code: "everyone_five",
      name: "Każdy dokłada rękę",
      description: "Każdy domownik wykona w tym tygodniu po 5 obowiązków.",
      icon: "🤝",
      periodLabel: "Ten tydzień",
      checkpoints: membersResult.rows.map((member) => ({
        label: member.displayName,
        current: member.weeklyCount,
        target: 5,
      })),
    }),
    createMission({
      code: "weekend_reset",
      name: "Weekendowy reset",
      description: "Wspólnie odświeżcie kilka części domu od piątku do niedzieli.",
      icon: "🌀",
      periodLabel: "Piątek–niedziela",
      checkpoints: [
        { label: "Wykonane zadania", current: stats?.weekendTasks ?? 0, target: 8 },
        { label: "Różne przestrzenie", current: stats?.weekendSpaces ?? 0, target: 3 },
        { label: "Zaangażowani domownicy", current: stats?.weekendMembers ?? 0, target: memberTarget },
      ],
    }),
    createMission({
      code: "bathroom_operation",
      name: "Operacja Łazienka",
      description: "Kompleksowa wspólna akcja łazienkowa w tym miesiącu.",
      icon: "🫧",
      periodLabel: "Ten miesiąc",
      checkpoints: [
        { label: "Zadania łazienkowe", current: stats?.bathroomTasks ?? 0, target: 8 },
        { label: "Różne czynności", current: stats?.bathroomKinds ?? 0, target: 4 },
        { label: "Zaangażowani domownicy", current: stats?.bathroomMembers ?? 0, target: memberTarget },
      ],
    }),
    createMission({
      code: "animal_team",
      name: "Zwierzęca ekipa",
      description: "Razem zadbajcie o cztery koty i psa.",
      icon: "🐾",
      periodLabel: "Ten miesiąc",
      checkpoints: [
        { label: "Zadania przy zwierzętach", current: stats?.petTasks ?? 0, target: 12 },
        { label: "Zaangażowani domownicy", current: stats?.petMembers ?? 0, target: memberTarget },
      ],
    }),
    createMission({
      code: season.code,
      name: season.name,
      description: season.description,
      icon: season.icon,
      periodLabel: season.label,
      checkpoints: [
        {
          label: "Zadania sezonowe",
          current: seasonStats?.taskCount ?? 0,
          target: season.taskTarget,
        },
        {
          label: "Różne przestrzenie",
          current: seasonStats?.spaceCount ?? 0,
          target: season.spaceTarget,
        },
        {
          label: "Zaangażowani domownicy",
          current: seasonStats?.memberCount ?? 0,
          target: memberTarget,
        },
      ],
    }),
  ];
}
