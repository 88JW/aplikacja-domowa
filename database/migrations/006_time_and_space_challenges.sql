alter table home_tasks.achievement_definitions
  add column if not exists challenge_group text not null default 'general';

alter table home_tasks.achievement_definitions
  drop constraint if exists achievement_definitions_challenge_group_check;

alter table home_tasks.achievement_definitions
  add constraint achievement_definitions_challenge_group_check
  check (challenge_group in ('general', 'time', 'space'));

insert into home_tasks.categories (household_id, name, icon)
select id, 'Ogród', '🌿'
from home_tasks.households
on conflict (household_id, name) do update
set icon = excluded.icon;

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
  (
    'morning_tasks',
    'Poranny rozruch',
    'Wykonaj 5 zadań między 05:00 a 10:00 w tym miesiącu.',
    '🌅',
    'individual',
    210,
    'time'
  ),
  (
    'noon_tasks',
    'Południowy pomocnik',
    'Wykonaj 5 zadań między 10:00 a 14:00 w tym miesiącu.',
    '☀️',
    'individual',
    220,
    'time'
  ),
  (
    'afternoon_tasks',
    'Popołudniowa energia',
    'Wykonaj 5 zadań między 14:00 a 18:00 w tym miesiącu.',
    '🌤️',
    'individual',
    230,
    'time'
  ),
  (
    'evening_tasks',
    'Wieczorny finisz',
    'Wykonaj 5 zadań między 18:00 a 23:00 w tym miesiącu.',
    '🌆',
    'individual',
    240,
    'time'
  ),
  (
    'night_tasks',
    'Nocna zmiana',
    'Wykonaj 3 zadania między 23:00 a 05:00 w tym miesiącu.',
    '🌙',
    'individual',
    250,
    'time'
  ),
  (
    'space_kitchen',
    'Król kuchni',
    'Wykonaj 5 zadań z kategorii Kuchnia w tym miesiącu.',
    '👑',
    'individual',
    310,
    'space'
  ),
  (
    'space_bathroom',
    'Mistrz łazienki',
    'Wykonaj 5 zadań z kategorii Łazienka w tym miesiącu.',
    '🫧',
    'individual',
    320,
    'space'
  ),
  (
    'space_garden',
    'Strażnik ogrodu',
    'Wykonaj 5 zadań z kategorii Ogród w tym miesiącu.',
    '🌿',
    'individual',
    330,
    'space'
  ),
  (
    'space_living_room',
    'Salon na medal',
    'Wykonaj 5 zadań z kategorii Salon w tym miesiącu.',
    '🏅',
    'individual',
    340,
    'space'
  ),
  (
    'space_bedroom',
    'Sypialnia zen',
    'Wykonaj 5 zadań z kategorii Sypialnia w tym miesiącu.',
    '🛏️',
    'individual',
    350,
    'space'
  ),
  (
    'space_laundry',
    'Pralniowy ekspert',
    'Wykonaj 5 zadań z kategorii Pranie w tym miesiącu.',
    '🧺',
    'individual',
    360,
    'space'
  ),
  (
    'space_pets',
    'Przyjaciel zwierząt',
    'Wykonaj 5 zadań z kategorii Zwierzęta w tym miesiącu.',
    '🐾',
    'individual',
    370,
    'space'
  )
on conflict (code) do update
set
  name = excluded.name,
  description = excluded.description,
  icon = excluded.icon,
  scope = excluded.scope,
  sort_order = excluded.sort_order,
  challenge_group = excluded.challenge_group;
