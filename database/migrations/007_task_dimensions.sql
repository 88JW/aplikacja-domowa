create table if not exists home_tasks.task_attributes (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references home_tasks.households(id) on delete cascade,
  code text not null,
  name text not null,
  icon text,
  kind text not null check (kind in ('space', 'activity')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (household_id, kind, code),
  unique (household_id, kind, name)
);

create table if not exists home_tasks.task_template_attributes (
  task_template_id uuid not null
    references home_tasks.task_templates(id) on delete cascade,
  attribute_id uuid not null
    references home_tasks.task_attributes(id) on delete cascade,
  primary key (task_template_id, attribute_id)
);

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
  seed.kind,
  seed.sort_order
from home_tasks.households h
cross join (
  values
    ('kitchen', 'Kuchnia', '🍽️', 'space', 10),
    ('bathroom', 'Łazienka', '🚿', 'space', 20),
    ('garden', 'Ogród', '🌿', 'space', 30),
    ('living_room', 'Salon', '🛋️', 'space', 40),
    ('bedroom', 'Sypialnia', '🛏️', 'space', 50),
    ('whole_home', 'Cały dom', '🏠', 'space', 60),
    ('washing', 'Mycie', '🫧', 'activity', 110),
    ('vacuuming', 'Odkurzanie', '🧹', 'activity', 120),
    ('dusting', 'Ścieranie kurzu', '✨', 'activity', 130),
    ('tidying', 'Porządkowanie', '🧺', 'activity', 140),
    ('laundry', 'Pranie', '👕', 'activity', 150),
    ('dishes', 'Naczynia i zmywarka', '🍽️', 'activity', 160),
    ('waste', 'Odpady', '🗑️', 'activity', 170),
    ('pet_care', 'Opieka nad zwierzętami', '🐾', 'activity', 180)
) seed(code, name, icon, kind, sort_order)
on conflict (household_id, kind, code) do update
set
  name = excluded.name,
  icon = excluded.icon,
  sort_order = excluded.sort_order;

insert into home_tasks.task_template_attributes (task_template_id, attribute_id)
select tt.id, a.id
from home_tasks.task_templates tt
join home_tasks.categories c on c.id = tt.category_id
join home_tasks.task_attributes a
  on a.household_id = tt.household_id
 and a.kind = 'space'
 and a.code = case c.name
   when 'Kuchnia' then 'kitchen'
   when 'Łazienka' then 'bathroom'
   when 'Ogród' then 'garden'
   when 'Salon' then 'living_room'
   when 'Sypialnia' then 'bedroom'
 end
where c.name in ('Kuchnia', 'Łazienka', 'Ogród', 'Salon', 'Sypialnia')
on conflict do nothing;

insert into home_tasks.task_template_attributes (task_template_id, attribute_id)
select tt.id, a.id
from home_tasks.task_templates tt
left join home_tasks.categories c on c.id = tt.category_id
join home_tasks.task_attributes a
  on a.household_id = tt.household_id
 and a.kind = 'activity'
 and a.code = case
   when lower(tt.name) like '%odkurz%' then 'vacuuming'
   when lower(tt.name) like '%kurz%' then 'dusting'
   when lower(tt.name) like '%zmywark%'
     or lower(tt.name) like '%naczyni%' then 'dishes'
   when lower(tt.name) like '%kosz%'
     or lower(tt.name) like '%odpad%' then 'waste'
   when c.name = 'Pranie'
     or lower(tt.name) like '%prani%'
     or lower(tt.name) like '%prasowa%'
     or lower(tt.name) like '%prasowani%' then 'laundry'
   when c.name = 'Zwierzęta' then 'pet_care'
   when lower(tt.name) like '%umyć%'
     or lower(tt.name) like '%wyczyścić%'
     or lower(tt.name) like '%wytrzeć%' then 'washing'
   else 'tidying'
 end
on conflict do nothing;

alter table home_tasks.achievement_definitions
  drop constraint if exists achievement_definitions_challenge_group_check;

alter table home_tasks.achievement_definitions
  add constraint achievement_definitions_challenge_group_check
  check (challenge_group in ('general', 'time', 'space', 'activity', 'combo'));

delete from home_tasks.achievement_definitions
where code in ('space_laundry', 'space_pets');

insert into home_tasks.achievement_definitions (
  code,
  name,
  description,
  icon,
  scope,
  sort_order,
  challenge_group
)
values
  ('space_whole_home', 'Gospodarz całego domu', 'Wykonaj 5 zadań oznaczonych przestrzenią Cały dom.', '🏠', 'individual', 380, 'space'),
  ('activity_washing', 'Mistrz mycia', 'Wykonaj 5 zadań oznaczonych jako Mycie w tym miesiącu.', '🫧', 'individual', 410, 'activity'),
  ('activity_vacuuming', 'Pogromca kurzu', 'Wykonaj 5 odkurzań w tym miesiącu.', '🧹', 'individual', 420, 'activity'),
  ('activity_dusting', 'Ani śladu kurzu', 'Wytrzyj kurz 5 razy w tym miesiącu.', '✨', 'individual', 430, 'activity'),
  ('activity_tidying', 'Wszystko na miejscu', 'Wykonaj 5 zadań porządkowych w tym miesiącu.', '🧺', 'individual', 440, 'activity'),
  ('activity_laundry', 'Pralniowy zawodowiec', 'Wykonaj 5 etapów prania w tym miesiącu.', '👕', 'individual', 450, 'activity'),
  ('activity_dishes', 'Strażnik zmywarki', 'Wykonaj 5 zadań związanych z naczyniami w tym miesiącu.', '🍽️', 'individual', 460, 'activity'),
  ('activity_waste', 'Łowca odpadów', 'Wykonaj 5 zadań związanych z odpadami w tym miesiącu.', '🗑️', 'individual', 470, 'activity'),
  ('activity_pet_care', 'Opiekun zwierząt', 'Wykonaj 5 zadań związanych ze zwierzętami w tym miesiącu.', '🐾', 'individual', 480, 'activity'),
  ('combo_washing_kitchen', 'Lśniąca kuchnia', 'Wykonaj 3 zadania Mycie w przestrzeni Kuchnia.', '✨', 'individual', 510, 'combo'),
  ('combo_washing_bathroom', 'Lśniąca łazienka', 'Wykonaj 3 zadania Mycie w przestrzeni Łazienka.', '🫧', 'individual', 520, 'combo'),
  ('combo_washing_garden', 'Ogród pod kontrolą', 'Wykonaj 3 zadania Mycie w przestrzeni Ogród.', '🌿', 'individual', 530, 'combo'),
  ('combo_washing_living_room', 'Lśniący salon', 'Wykonaj 3 zadania Mycie w przestrzeni Salon.', '🛋️', 'individual', 540, 'combo'),
  ('combo_washing_bedroom', 'Lśniąca sypialnia', 'Wykonaj 3 zadania Mycie w przestrzeni Sypialnia.', '🛏️', 'individual', 550, 'combo')
on conflict (code) do update
set
  name = excluded.name,
  description = excluded.description,
  icon = excluded.icon,
  scope = excluded.scope,
  sort_order = excluded.sort_order,
  challenge_group = excluded.challenge_group;
