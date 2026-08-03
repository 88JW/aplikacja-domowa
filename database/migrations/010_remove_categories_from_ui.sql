update home_tasks.task_templates
set category_id = null
where category_id is not null;

update home_tasks.achievement_definitions
set description = case code
  when 'five_categories' then
    'Wykonaj w tym miesiącu zadania z 5 różnymi przestrzeniami lub czynnościami.'
  when 'space_kitchen' then
    'Wykonaj 5 zadań oznaczonych przestrzenią Kuchnia w tym miesiącu.'
  when 'space_bathroom' then
    'Wykonaj 5 zadań oznaczonych przestrzenią Łazienka w tym miesiącu.'
  when 'space_garden' then
    'Wykonaj 5 zadań oznaczonych przestrzenią Ogród w tym miesiącu.'
  when 'space_living_room' then
    'Wykonaj 5 zadań oznaczonych przestrzenią Salon w tym miesiącu.'
  when 'space_bedroom' then
    'Wykonaj 5 zadań oznaczonych przestrzenią Sypialnia w tym miesiącu.'
  else description
end
where code in (
  'five_categories',
  'space_kitchen',
  'space_bathroom',
  'space_garden',
  'space_living_room',
  'space_bedroom'
);
