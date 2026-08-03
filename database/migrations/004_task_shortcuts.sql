create table if not exists home_tasks.profile_task_shortcuts (
  profile_id uuid not null references home_tasks.profiles(id) on delete cascade,
  task_template_id uuid not null
    references home_tasks.task_templates(id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (profile_id, task_template_id)
);

create index if not exists profile_task_shortcuts_order_idx
  on home_tasks.profile_task_shortcuts (profile_id, sort_order, created_at);
