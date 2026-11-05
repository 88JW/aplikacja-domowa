create table if not exists home_tasks.pet_task_shortcuts (
  profile_id uuid not null references home_tasks.profiles(id) on delete cascade,
  task_id uuid not null references home_tasks.pet_tasks(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, task_id)
);

insert into home_tasks.pet_task_shortcuts (profile_id, task_id)
select hm.profile_id, t.id from home_tasks.pet_tasks t
join home_tasks.household_members hm on hm.household_id = t.household_id
where t.archived_at is null and t.name in ('Wyczyścić kuwetę', 'Spacer', 'Nakarmić', 'Podać leki')
on conflict do nothing;

alter table home_tasks.pet_tasks add column if not exists show_countdown boolean not null default false;
update home_tasks.pet_tasks set show_countdown = true
where name in ('Wyczyścić kuwetę', 'Spacer') and schedule = 'both';
