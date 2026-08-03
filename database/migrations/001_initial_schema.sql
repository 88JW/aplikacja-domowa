create extension if not exists pgcrypto;
create schema if not exists home_tasks;

create table if not exists home_tasks.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists home_tasks.profiles (
  id uuid primary key default gen_random_uuid(),
  sso_subject text unique not null,
  email text unique not null,
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists home_tasks.household_members (
  household_id uuid not null references home_tasks.households(id) on delete cascade,
  profile_id uuid not null references home_tasks.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  joined_at timestamptz not null default now(),
  primary key (household_id, profile_id)
);

create table if not exists home_tasks.categories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references home_tasks.households(id) on delete cascade,
  name text not null,
  icon text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  unique (household_id, name)
);

create table if not exists home_tasks.task_templates (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references home_tasks.households(id) on delete cascade,
  category_id uuid references home_tasks.categories(id) on delete set null,
  name text not null,
  icon text,
  created_by uuid references home_tasks.profiles(id) on delete set null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  unique (household_id, name)
);

create table if not exists home_tasks.planned_tasks (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references home_tasks.households(id) on delete cascade,
  task_template_id uuid not null references home_tasks.task_templates(id),
  scheduled_for date not null,
  assigned_to uuid references home_tasks.profiles(id) on delete set null,
  created_by uuid references home_tasks.profiles(id) on delete set null,
  status text not null default 'todo'
    check (status in ('todo', 'in_progress', 'completed', 'skipped')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists home_tasks.task_completions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references home_tasks.households(id) on delete cascade,
  task_template_id uuid not null references home_tasks.task_templates(id),
  planned_task_id uuid references home_tasks.planned_tasks(id) on delete set null,
  completed_by uuid not null references home_tasks.profiles(id),
  points smallint not null default 1 check (points = 1),
  note text,
  photo_url text,
  completed_at timestamptz not null default now(),
  undone_at timestamptz
);

create index if not exists planned_tasks_household_date_idx
  on home_tasks.planned_tasks (household_id, scheduled_for);

create index if not exists task_completions_household_date_idx
  on home_tasks.task_completions (household_id, completed_at desc);

create index if not exists task_completions_profile_date_idx
  on home_tasks.task_completions (completed_by, completed_at desc);
