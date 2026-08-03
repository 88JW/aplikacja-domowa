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
  'space',
  seed.sort_order
from home_tasks.households h
cross join (
  values
    ('ground_entry', 'Przedsionek', '🚪', 11),
    ('ground_hall', 'Przedpokój', '🧥', 12),
    ('ground_office', 'Gabinet na parterze', '💻', 13),
    ('ground_bathroom', 'Łazienka na parterze', '🚿', 14),
    ('ground_pantry', 'Spiżarnia', '🥫', 15),
    ('upper_stairs', 'Schody', '🪜', 21),
    ('upper_hall', 'Korytarz na piętrze', '🚶', 22),
    ('upper_wardrobe', 'Garderoba', '👚', 23),
    ('upper_bathroom', 'Łazienka na piętrze', '🛁', 24),
    ('upper_bavarian_office', 'Bawarski gabinet', '🖋️', 25),
    ('garage_main', 'Garaż', '🚗', 31),
    ('garage_storage', 'Schowek w garażu', '📦', 32),
    ('garden_front', 'Ogród — front', '🌼', 41),
    ('garden_back', 'Ogród — tył', '🌳', 42),
    ('garden_far_back', 'Ogród — dalszy tył', '🌲', 43),
    ('garden_terrace', 'Taras', '🪴', 44),
    ('garden_fruit', 'Część owocowa', '🍎', 45),
    ('garden_vegetable', 'Część warzywna', '🥕', 46),
    ('garden_andrzej', 'Część Andrzeja', '🌻', 47)
) seed(code, name, icon, sort_order)
on conflict (household_id, kind, code) do update
set
  name = excluded.name,
  icon = excluded.icon,
  sort_order = excluded.sort_order;
