alter table home_tasks.recurring_task_rules
  add column if not exists interval_days integer;

alter table home_tasks.recurring_task_rules
  drop constraint if exists recurring_task_rules_frequency_check,
  drop constraint if exists recurring_task_rules_check,
  drop constraint if exists recurring_task_rules_recurrence_shape_check;

alter table home_tasks.recurring_task_rules
  add constraint recurring_task_rules_frequency_check
    check (frequency in ('daily', 'weekly', 'interval')),
  add constraint recurring_task_rules_recurrence_shape_check check (
    (frequency = 'daily' and day_of_week is null and interval_days is null)
    or (frequency = 'weekly' and day_of_week is not null and interval_days is null)
    or (frequency = 'interval' and day_of_week is null and interval_days between 2 and 365)
  );

insert into home_tasks.task_attributes (household_id, code, name, icon, kind, sort_order)
select h.id, seed.code, seed.name, seed.icon, seed.kind, seed.sort_order
from home_tasks.households h
cross join (
  values
    ('ground_floor', 'Parter', '🏡', 'space', 5),
    ('upper_floor', 'Piętro', '🪜', 'space', 6),
    ('plant_watering', 'Podlewanie roślin', '💧', 'activity', 240)
) seed(code, name, icon, kind, sort_order)
on conflict (household_id, kind, code) do update
set name = excluded.name, icon = excluded.icon, sort_order = excluded.sort_order;

insert into home_tasks.task_templates (household_id, name, icon, created_by)
select
  h.id,
  seed.name,
  seed.icon,
  (select hm.profile_id from home_tasks.household_members hm
   where hm.household_id = h.id order by hm.joined_at limit 1)
from home_tasks.households h
cross join (values
  ('Podlej kwiaty na parterze', '🪴'),
  ('Podlej kwiaty na piętrze', '🌿')
) seed(name, icon)
on conflict (household_id, name) do update
set icon = excluded.icon, archived_at = null;

insert into home_tasks.task_template_attributes (task_template_id, attribute_id)
select tt.id, a.id
from home_tasks.task_templates tt
join home_tasks.task_attributes a
  on a.household_id = tt.household_id
 and (
   a.code = 'plant_watering'
   or (tt.name = 'Podlej kwiaty na parterze' and a.code = 'ground_floor')
   or (tt.name = 'Podlej kwiaty na piętrze' and a.code = 'upper_floor')
 )
where tt.name in ('Podlej kwiaty na parterze', 'Podlej kwiaty na piętrze')
on conflict do nothing;

insert into home_tasks.recurring_task_rules (
  household_id, task_template_id, frequency, interval_days, starts_on
)
select tt.household_id, tt.id, 'interval', 4, current_date
from home_tasks.task_templates tt
where tt.name in ('Podlej kwiaty na parterze', 'Podlej kwiaty na piętrze')
  and not exists (
    select 1 from home_tasks.recurring_task_rules r
    where r.household_id = tt.household_id
      and r.task_template_id = tt.id
      and r.frequency = 'interval'
      and r.active = true
  );

insert into home_tasks.achievement_definitions (
  code, name, description, icon, scope, sort_order, challenge_group,
  progress_kind, progress_attribute_code, target
)
values (
  'activity_plant_watering', 'Zielona ręka',
  'Podlej domowe rośliny 4 razy w tym miesiącu.', '🪴', 'individual', 535,
  'activity', 'attribute', 'plant_watering', 4
)
on conflict (code) do update
set name = excluded.name, description = excluded.description,
  icon = excluded.icon, scope = excluded.scope, sort_order = excluded.sort_order,
  challenge_group = excluded.challenge_group, progress_kind = excluded.progress_kind,
  progress_attribute_code = excluded.progress_attribute_code, target = excluded.target;
