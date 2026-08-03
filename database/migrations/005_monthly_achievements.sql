alter table home_tasks.profile_achievements
  add column if not exists period_start date;

update home_tasks.profile_achievements
set period_start = date_trunc('month', earned_at)::date
where period_start is null;

alter table home_tasks.profile_achievements
  alter column period_start set not null;

alter table home_tasks.profile_achievements
  drop constraint if exists profile_achievements_pkey;

alter table home_tasks.profile_achievements
  add primary key (profile_id, achievement_code, period_start);

alter table home_tasks.household_achievements
  add column if not exists period_start date;

update home_tasks.household_achievements
set period_start = date_trunc('month', earned_at)::date
where period_start is null;

alter table home_tasks.household_achievements
  alter column period_start set not null;

alter table home_tasks.household_achievements
  drop constraint if exists household_achievements_pkey;

alter table home_tasks.household_achievements
  add primary key (household_id, achievement_code, period_start);

update home_tasks.achievement_definitions
set description = case code
  when 'first_task' then 'Wykonaj pierwsze zadanie w tym miesiącu.'
  when 'ten_tasks' then 'Wykonaj 10 zadań w tym miesiącu.'
  when 'five_categories' then 'Wykonaj w tym miesiącu zadania z 5 kategorii.'
  when 'three_day_streak' then 'Pomagaj przez 3 kolejne dni w tym miesiącu.'
  when 'household_25' then 'Domownicy wykonają razem 25 zadań w tym miesiącu.'
  when 'everyone_week' then 'Każdy domownik wykona zadanie w tym tygodniu.'
  else description
end;
