create table if not exists home_tasks.notifications (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references home_tasks.households(id) on delete cascade,
  recipient_profile_id uuid not null references home_tasks.profiles(id) on delete cascade,
  actor_profile_id uuid references home_tasks.profiles(id) on delete set null,
  planned_task_id uuid references home_tasks.planned_tasks(id) on delete set null,
  notification_type text not null default 'task_assigned',
  title text not null,
  body text not null,
  href text not null default '/app',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_recipient_created_idx
  on home_tasks.notifications (recipient_profile_id, created_at desc);

create index if not exists notifications_recipient_unread_idx
  on home_tasks.notifications (recipient_profile_id, created_at desc)
  where read_at is null;

create unique index if not exists notifications_task_recipient_idx
  on home_tasks.notifications (planned_task_id, recipient_profile_id)
  where planned_task_id is not null;

create table if not exists home_tasks.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references home_tasks.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  failure_count integer not null default 0,
  last_success_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists push_subscriptions_profile_idx
  on home_tasks.push_subscriptions (profile_id, updated_at desc);
