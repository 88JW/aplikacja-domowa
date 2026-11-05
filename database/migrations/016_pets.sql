create table if not exists home_tasks.pet_tasks (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references home_tasks.households(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  schedule text not null check (schedule in ('morning', 'evening', 'both', 'manual')),
  created_by uuid references home_tasks.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  archived_at timestamptz
);
create table if not exists home_tasks.pet_task_completions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references home_tasks.pet_tasks(id) on delete cascade,
  completion_date date not null,
  slot text not null check (slot in ('morning', 'evening', 'manual')),
  completed_by uuid references home_tasks.profiles(id) on delete set null,
  completed_at timestamptz not null default now(),
  unique (task_id, completion_date, slot)
);
insert into home_tasks.pet_tasks (household_id, name, schedule)
select h.id, defaults.name, defaults.schedule from home_tasks.households h
cross join (values ('Wyczyścić kuwetę', 'both'), ('Spacer', 'both'),
                   ('Nakarmić', 'manual'), ('Podać leki', 'manual')) as defaults(name, schedule)
where not exists (select 1 from home_tasks.pet_tasks t where t.household_id = h.id);
