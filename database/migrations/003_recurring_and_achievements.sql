create table if not exists home_tasks.recurring_task_rules (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references home_tasks.households(id) on delete cascade,
  task_template_id uuid not null references home_tasks.task_templates(id),
  assigned_to uuid references home_tasks.profiles(id) on delete set null,
  created_by uuid references home_tasks.profiles(id) on delete set null,
  frequency text not null check (frequency in ('daily', 'weekly')),
  day_of_week smallint check (day_of_week between 0 and 6),
  starts_on date not null default current_date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (
    (frequency = 'daily' and day_of_week is null)
    or (frequency = 'weekly' and day_of_week is not null)
  )
);

alter table home_tasks.planned_tasks
  add column if not exists recurring_rule_id uuid
  references home_tasks.recurring_task_rules(id) on delete set null;

create unique index if not exists planned_tasks_recurring_date_idx
  on home_tasks.planned_tasks (recurring_rule_id, scheduled_for)
  where recurring_rule_id is not null;

create table if not exists home_tasks.achievement_definitions (
  code text primary key,
  name text not null,
  description text not null,
  icon text not null,
  scope text not null check (scope in ('individual', 'household')),
  sort_order integer not null default 0
);

create table if not exists home_tasks.profile_achievements (
  profile_id uuid not null references home_tasks.profiles(id) on delete cascade,
  achievement_code text not null
    references home_tasks.achievement_definitions(code) on delete cascade,
  earned_at timestamptz not null default now(),
  primary key (profile_id, achievement_code)
);

create table if not exists home_tasks.household_achievements (
  household_id uuid not null references home_tasks.households(id) on delete cascade,
  achievement_code text not null
    references home_tasks.achievement_definitions(code) on delete cascade,
  earned_at timestamptz not null default now(),
  primary key (household_id, achievement_code)
);

insert into home_tasks.achievement_definitions (
  code,
  name,
  description,
  icon,
  scope,
  sort_order
)
values
  ('first_task', 'Pierwszy krok', 'Wykonaj pierwsze zadanie.', '🌱', 'individual', 10),
  ('ten_tasks', 'Pomocna dłoń', 'Wykonaj 10 zadań.', '🙌', 'individual', 20),
  ('five_categories', 'Wszechstronny domownik', 'Wykonaj zadania z 5 kategorii.', '🧭', 'individual', 30),
  ('three_day_streak', 'Dobra passa', 'Pomagaj przez 3 kolejne dni.', '🔥', 'individual', 40),
  ('household_25', 'Wspólnymi siłami', 'Domownicy wykonają razem 25 zadań.', '🏠', 'household', 110),
  ('everyone_week', 'Każdy pomaga', 'Każdy domownik wykona zadanie w tym tygodniu.', '🤝', 'household', 120)
on conflict (code) do update
set
  name = excluded.name,
  description = excluded.description,
  icon = excluded.icon,
  scope = excluded.scope,
  sort_order = excluded.sort_order;
