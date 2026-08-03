create or replace function home_tasks.seed_household_catalog(
  target_household_id uuid,
  author_profile_id uuid
)
returns void
language plpgsql
as $$
begin
  insert into home_tasks.categories (household_id, name, icon)
  values
    (target_household_id, 'Łazienka', '🚿'),
    (target_household_id, 'Pranie', '🧺'),
    (target_household_id, 'Kuchnia', '🍽️'),
    (target_household_id, 'Zwierzęta', '🐾'),
    (target_household_id, 'Salon', '🛋️'),
    (target_household_id, 'Sypialnia', '🛏️'),
    (target_household_id, 'Inne', '✨')
  on conflict (household_id, name) do nothing;

  insert into home_tasks.task_templates (
    household_id,
    category_id,
    name,
    icon,
    created_by
  )
  select
    target_household_id,
    c.id,
    seed.name,
    seed.icon,
    author_profile_id
  from (
    values
      ('Łazienka', 'Umyć prysznic lub wannę', '🚿'),
      ('Łazienka', 'Umyć toaletę', '🚽'),
      ('Łazienka', 'Umyć umywalkę', '🫧'),
      ('Łazienka', 'Umyć lustro', '🪞'),
      ('Łazienka', 'Umyć podłogę w łazience', '🧹'),
      ('Łazienka', 'Opróżnić kosz w łazience', '🗑️'),
      ('Pranie', 'Wstawić pranie', '🧺'),
      ('Pranie', 'Rozwiesić pranie', '👕'),
      ('Pranie', 'Zdjąć suche pranie', '🧦'),
      ('Pranie', 'Poskładać pranie', '👚'),
      ('Pranie', 'Pochować pranie', '🗄️'),
      ('Pranie', 'Prasować', '♨️'),
      ('Kuchnia', 'Załadować zmywarkę', '🍽️'),
      ('Kuchnia', 'Rozładować zmywarkę', '🥣'),
      ('Kuchnia', 'Umyć naczynia ręcznie', '🫧'),
      ('Kuchnia', 'Wytrzeć blaty', '🧽'),
      ('Kuchnia', 'Umyć zlew', '🚰'),
      ('Kuchnia', 'Umyć płytę', '🍳'),
      ('Kuchnia', 'Opróżnić kosz', '🗑️'),
      ('Zwierzęta', 'Wyczyścić kuwetę', '🐈'),
      ('Zwierzęta', 'Uzupełnić wodę', '💧'),
      ('Zwierzęta', 'Nakarmić zwierzęta', '🐾'),
      ('Salon', 'Odkurzyć salon', '🧹'),
      ('Salon', 'Wytrzeć kurz w salonie', '✨'),
      ('Sypialnia', 'Zmienić pościel', '🛏️')
  ) as seed(category_name, name, icon)
  join home_tasks.categories c
    on c.household_id = target_household_id
   and c.name = seed.category_name
  on conflict (household_id, name) do nothing;
end;
$$;
