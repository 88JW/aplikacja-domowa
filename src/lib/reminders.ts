import { db } from "@/lib/db";
import { sendPushForNotifications } from "@/lib/push";
import { materializeRecurringTasks } from "@/lib/recurring";

type ReminderPhase = {
  date: string;
  phase: "today" | "tomorrow";
  title: string;
};

function warsawDate(offsetDays = 0) {
  const date = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Warsaw",
  }).format(date);
}

export async function generateTaskReminders() {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Warsaw",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(new Date()),
  );
  const phases: ReminderPhase[] = [];

  if (hour >= 7) {
    phases.push({
      date: warsawDate(),
      phase: "today",
      title: "Zadanie czeka na dzisiaj",
    });
  }

  if (hour >= 18) {
    phases.push({
      date: warsawDate(1),
      phase: "tomorrow",
      title: "Zadanie zaplanowane na jutro",
    });
  }

  const notificationIds: string[] = [];
  const households = await db.query<{ householdId: string }>(
    `select id as "householdId" from home_tasks.households`,
  );

  for (const date of new Set(phases.map((phase) => phase.date))) {
    for (const household of households.rows) {
      await materializeRecurringTasks(household, date);
    }
  }

  for (const phase of phases) {
    const result = await db.query<{ id: string }>(
      `
        insert into home_tasks.notifications (
          household_id,
          recipient_profile_id,
          planned_task_id,
          notification_type,
          title,
          body,
          href,
          dedupe_key
        )
        select
          pt.household_id,
          hm.profile_id,
          pt.id,
          'task_reminder',
          case
            when exists (
              select 1
              from home_tasks.task_template_attributes tta
              join home_tasks.task_attributes a on a.id = tta.attribute_id
              where tta.task_template_id = tt.id
                and a.kind = 'activity'
                and a.code = 'plant_watering'
            ) then case
              when $2::text = 'tomorrow' then '🪴 Jutro podlewanie kwiatów'
              else '🪴 Czas podlać kwiaty'
            end
            else $3
          end,
          concat(coalesce(tt.icon, '✓'), ' ', tt.name),
          concat('/app/plan?date=', pt.scheduled_for::text),
          concat('reminder:', pt.id::text, ':', $2::text, ':', hm.profile_id::text)
        from home_tasks.planned_tasks pt
        join home_tasks.task_templates tt on tt.id = pt.task_template_id
        join home_tasks.household_members hm
          on hm.household_id = pt.household_id
         and (pt.assigned_to is null or hm.profile_id = pt.assigned_to)
        where pt.scheduled_for = $1::date
          and pt.status in ('todo', 'in_progress')
        on conflict (recipient_profile_id, dedupe_key)
          where dedupe_key is not null
        do nothing
        returning id
      `,
      [phase.date, phase.phase, phase.title],
    );
    notificationIds.push(...result.rows.map((item) => item.id));
  }

  const petSlot = hour >= 18 ? "evening" : hour >= 7 ? "morning" : null;
  if (petSlot) {
    const petReminders = await db.query<{ id: string }>(
      `insert into home_tasks.notifications
        (household_id, recipient_profile_id, notification_type, title, body, href, dedupe_key)
       select t.household_id, hm.profile_id, 'pet_reminder',
         case when $1 = 'morning' then '🐾 Poranna opieka nad zwierzakami' else '🐾 Wieczorna opieka nad zwierzakami' end,
         t.name, '/app/pets', concat('pet:', t.id, ':', (now() at time zone 'Europe/Warsaw')::date, ':', $1, ':', hm.profile_id)
       from home_tasks.pet_tasks t
       join home_tasks.household_members hm on hm.household_id = t.household_id
       where t.archived_at is null and t.schedule in ($1, 'both')
         and not exists (select 1 from home_tasks.pet_task_completions c
           where c.task_id = t.id and c.slot = $1
             and c.completion_date = (now() at time zone 'Europe/Warsaw')::date)
       on conflict (recipient_profile_id, dedupe_key) where dedupe_key is not null do nothing
       returning id`,
      [petSlot],
    );
    notificationIds.push(...petReminders.rows.map((item) => item.id));
  }

  await sendPushForNotifications(notificationIds);
  return notificationIds.length;
}
