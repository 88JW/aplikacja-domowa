create table if not exists home_tasks.waste_bag_outings (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references home_tasks.households(id) on delete cascade,
  month_start date not null check (month_start = date_trunc('month', month_start)::date),
  bag_number smallint not null check (bag_number between 1 and 8),
  marked_by uuid references home_tasks.profiles(id) on delete set null,
  marked_at timestamptz not null default now(),
  unique (household_id, month_start, bag_number)
);

create table if not exists home_tasks.waste_collection_days (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references home_tasks.households(id) on delete cascade,
  collection_date date not null,
  collection_kind text not null check (collection_kind in ('all', 'bio_residual')),
  created_by uuid references home_tasks.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (household_id, collection_date)
);

create index if not exists waste_collection_days_household_date_idx
  on home_tasks.waste_collection_days (household_id, collection_date);
