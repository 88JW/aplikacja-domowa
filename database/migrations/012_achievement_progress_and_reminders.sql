alter table home_tasks.achievement_definitions
  add column if not exists progress_kind text,
  add column if not exists progress_attribute_code text,
  add column if not exists progress_space_code text,
  add column if not exists progress_start_hour smallint,
  add column if not exists progress_end_hour smallint,
  add column if not exists target integer not null default 1;

update home_tasks.achievement_definitions
set
  progress_kind = case code
    when 'first_task' then 'profile_count'
    when 'ten_tasks' then 'profile_count'
    when 'five_categories' then 'distinct_attributes'
    when 'three_day_streak' then 'streak'
    when 'household_25' then 'household_count'
    when 'everyone_week' then 'household_members'
    when 'morning_tasks' then 'time'
    when 'noon_tasks' then 'time'
    when 'afternoon_tasks' then 'time'
    when 'evening_tasks' then 'time'
    when 'night_tasks' then 'time'
    else case
      when code like 'space_%' then 'attribute'
      when code like 'activity_%' then 'attribute'
      when code like 'combo_%' then 'combo'
      else progress_kind
    end
  end,
  target = case
    when code = 'first_task' then 1
    when code = 'ten_tasks' then 10
    when code = 'five_categories' then 5
    when code = 'three_day_streak' then 3
    when code = 'household_25' then 25
    when code = 'everyone_week' then 2
    when code = 'night_tasks' then 3
    when code = 'activity_laundry_hanging' then 3
    when code = 'activity_laundry_folding' then 3
    when code = 'activity_laundry_ironing' then 3
    when code = 'activity_laundry_putting_away' then 3
    when code = 'activity_mowing' then 3
    when code like 'combo_%' then 3
    else 5
  end,
  progress_start_hour = case code
    when 'morning_tasks' then 5
    when 'noon_tasks' then 10
    when 'afternoon_tasks' then 14
    when 'evening_tasks' then 18
    when 'night_tasks' then 23
    else progress_start_hour
  end,
  progress_end_hour = case code
    when 'morning_tasks' then 10
    when 'noon_tasks' then 14
    when 'afternoon_tasks' then 18
    when 'evening_tasks' then 23
    when 'night_tasks' then 5
    else progress_end_hour
  end;

update home_tasks.achievement_definitions
set progress_attribute_code = substring(code from 7)
where code like 'space_%';

update home_tasks.achievement_definitions
set progress_attribute_code = substring(code from 10)
where code like 'activity_%';

update home_tasks.achievement_definitions
set
  progress_attribute_code = 'washing',
  progress_space_code = substring(code from 15)
where code like 'combo_washing_%';

insert into home_tasks.achievement_definitions (
  code,
  name,
  description,
  icon,
  scope,
  sort_order,
  challenge_group,
  progress_kind,
  progress_attribute_code,
  progress_space_code,
  target,
  image_path
)
values
  ('combo_vacuuming_living_room', 'Salon bez okruszka', 'Odkurz salon 3 razy w tym miesiącu.', '🧹', 'individual', 560, 'combo', 'combo', 'vacuuming', 'living_room', 3, '/images/achievements/generated/vacuum-living-room.png'),
  ('combo_vacuuming_bedroom', 'Spokojna sypialnia', 'Odkurz sypialnię 3 razy w tym miesiącu.', '🛏️', 'individual', 570, 'combo', 'combo', 'vacuuming', 'bedroom', 3, '/images/achievements/generated/vacuum-bedroom.png'),
  ('combo_dusting_living_room', 'Salon bez pyłku', 'Zetrzyj kurz w salonie 3 razy w tym miesiącu.', '✨', 'individual', 580, 'combo', 'combo', 'dusting', 'living_room', 3, '/images/achievements/generated/dusting-living-room.png'),
  ('combo_tidying_whole_home', 'Wszystko na swoim miejscu', 'Wykonaj 3 zadania porządkowe w całym domu.', '🧺', 'individual', 590, 'combo', 'combo', 'tidying', 'whole_home', 3, null),
  ('combo_pet_care_whole_home', 'Dom pełen łap', 'Wykonaj 3 zadania opieki nad zwierzętami w całym domu.', '🐾', 'individual', 600, 'combo', 'combo', 'pet_care', 'whole_home', 3, null)
on conflict (code) do update
set
  name = excluded.name,
  description = excluded.description,
  icon = excluded.icon,
  scope = excluded.scope,
  sort_order = excluded.sort_order,
  challenge_group = excluded.challenge_group,
  progress_kind = excluded.progress_kind,
  progress_attribute_code = excluded.progress_attribute_code,
  progress_space_code = excluded.progress_space_code,
  target = excluded.target,
  image_path = excluded.image_path;

alter table home_tasks.notifications
  add column if not exists dedupe_key text;

create unique index if not exists notifications_recipient_dedupe_idx
  on home_tasks.notifications (recipient_profile_id, dedupe_key)
  where dedupe_key is not null;

drop index if exists home_tasks.notifications_task_recipient_idx;

create unique index if not exists notifications_task_assignment_idx
  on home_tasks.notifications (planned_task_id, recipient_profile_id)
  where planned_task_id is not null
    and notification_type = 'task_assigned';
