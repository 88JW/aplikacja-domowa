alter table home_tasks.achievement_definitions
  add column if not exists image_path text;

insert into home_tasks.task_attributes (
  household_id,
  code,
  name,
  icon,
  kind,
  sort_order
)
select
  h.id,
  seed.code,
  seed.name,
  seed.icon,
  'activity',
  seed.sort_order
from home_tasks.households h
cross join (
  values
    ('laundry_hanging', 'Rozwieszanie prania', '👕', 190),
    ('laundry_folding', 'Składanie ubrań', '🧦', 200),
    ('laundry_ironing', 'Prasowanie', '♨️', 210),
    ('laundry_putting_away', 'Chowanie ubrań', '🗄️', 220),
    ('mowing', 'Koszenie trawy', '🌱', 230)
) seed(code, name, icon, sort_order)
on conflict (household_id, kind, code) do update
set
  name = excluded.name,
  icon = excluded.icon,
  sort_order = excluded.sort_order;

insert into home_tasks.task_template_attributes (task_template_id, attribute_id)
select tt.id, a.id
from home_tasks.task_templates tt
join home_tasks.task_attributes a
  on a.household_id = tt.household_id
 and a.kind = 'activity'
 and a.code = case
   when lower(tt.name) like '%rozwiesi%' then 'laundry_hanging'
   when lower(tt.name) like '%poskłada%' then 'laundry_folding'
   when lower(tt.name) like '%prasowa%' then 'laundry_ironing'
   when lower(tt.name) like '%pochowa%' then 'laundry_putting_away'
   when lower(tt.name) like '%skosi%'
     or lower(tt.name) like '%koszenie%'
     or lower(tt.name) like '%traw%' then 'mowing'
 end
where lower(tt.name) like '%rozwiesi%'
   or lower(tt.name) like '%poskłada%'
   or lower(tt.name) like '%prasowa%'
   or lower(tt.name) like '%pochowa%'
   or lower(tt.name) like '%skosi%'
   or lower(tt.name) like '%koszenie%'
   or lower(tt.name) like '%traw%'
on conflict do nothing;

insert into home_tasks.achievement_definitions (
  code,
  name,
  description,
  icon,
  scope,
  sort_order,
  challenge_group,
  image_path
)
values
  (
    'activity_laundry_hanging',
    'Mistrz suszenia',
    'Rozwieś pranie 3 razy w tym miesiącu.',
    '👕',
    'individual',
    490,
    'activity',
    '/images/achievements/lisek praniowy.png'
  ),
  (
    'activity_laundry_folding',
    'Mistrz składania',
    'Poskładaj ubrania 3 razy w tym miesiącu.',
    '🧦',
    'individual',
    500,
    'activity',
    '/images/achievements/clothes.png'
  ),
  (
    'activity_laundry_ironing',
    'Żelazna precyzja',
    'Prasuj 3 razy w tym miesiącu.',
    '♨️',
    'individual',
    510,
    'activity',
    '/images/achievements/iron-table.png'
  ),
  (
    'activity_laundry_putting_away',
    'Wszystko do szafy',
    'Pochowaj ubrania 3 razy w tym miesiącu.',
    '🗄️',
    'individual',
    520,
    'activity',
    '/images/achievements/lisek suszarkowy.png'
  ),
  (
    'activity_mowing',
    'Kosiarz ogrodu',
    'Skoś trawę 3 razy w tym miesiącu.',
    '🌱',
    'individual',
    530,
    'activity',
    '/images/achievements/lawn-mower.png'
  )
on conflict (code) do update
set
  name = excluded.name,
  description = excluded.description,
  icon = excluded.icon,
  scope = excluded.scope,
  sort_order = excluded.sort_order,
  challenge_group = excluded.challenge_group,
  image_path = excluded.image_path;

update home_tasks.achievement_definitions
set image_path = case code
  when 'activity_washing' then '/images/achievements/cleaning-mop.png'
  when 'activity_waste' then '/images/achievements/disposal.png'
  when 'activity_vacuuming' then '/images/achievements/vacum-cleaner.png'
  when 'activity_dishes' then '/images/achievements/master of dishwaser.png'
  when 'activity_laundry' then '/images/achievements/washmashine.png'
  when 'space_kitchen' then '/images/achievements/lisek pralkowy.png'
  when 'space_bathroom' then '/images/achievements/lisek łazienkowy.png'
  else image_path
end;
