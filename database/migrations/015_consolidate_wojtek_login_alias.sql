-- Wojtek can authenticate with either Google address, but both addresses use
-- the canonical HomeApp profile. Merge every profile-bound record before
-- removing the legacy profile created before alias normalization.
do $$
declare
  canonical_profile_id uuid;
  alias_profile_id uuid;
begin
  select id
  into canonical_profile_id
  from home_tasks.profiles
  where email = 'w.jaskula8@gmail.com';

  select id
  into alias_profile_id
  from home_tasks.profiles
  where email = 'derastro@gmail.com';

  if canonical_profile_id is null then
    return;
  end if;

  update home_tasks.profiles
  set display_name = 'Wojtek', updated_at = now()
  where id = canonical_profile_id;

  if alias_profile_id is null then
    return;
  end if;

  insert into home_tasks.profile_achievements (
    profile_id,
    achievement_code,
    earned_at,
    period_start
  )
  select canonical_profile_id, achievement_code, earned_at, period_start
  from home_tasks.profile_achievements
  where profile_id = alias_profile_id
  on conflict (profile_id, achievement_code, period_start) do nothing;

  insert into home_tasks.profile_task_shortcuts (
    profile_id,
    task_template_id,
    sort_order,
    created_at
  )
  select canonical_profile_id, task_template_id, sort_order, created_at
  from home_tasks.profile_task_shortcuts
  where profile_id = alias_profile_id
  on conflict (profile_id, task_template_id) do nothing;

  delete from home_tasks.household_members alias_member
  using home_tasks.household_members canonical_member
  where alias_member.profile_id = alias_profile_id
    and canonical_member.profile_id = canonical_profile_id
    and canonical_member.household_id = alias_member.household_id;

  delete from home_tasks.notifications alias_notification
  using home_tasks.notifications canonical_notification
  where alias_notification.recipient_profile_id = alias_profile_id
    and canonical_notification.recipient_profile_id = canonical_profile_id
    and (
      (
        alias_notification.dedupe_key is not null
        and alias_notification.dedupe_key = canonical_notification.dedupe_key
      )
      or (
        alias_notification.notification_type = 'task_assigned'
        and alias_notification.planned_task_id is not null
        and alias_notification.planned_task_id = canonical_notification.planned_task_id
      )
    );

  update home_tasks.task_completions
  set completed_by = canonical_profile_id
  where completed_by = alias_profile_id;

  update home_tasks.planned_tasks
  set assigned_to = canonical_profile_id
  where assigned_to = alias_profile_id;

  update home_tasks.planned_tasks
  set created_by = canonical_profile_id
  where created_by = alias_profile_id;

  update home_tasks.recurring_task_rules
  set assigned_to = canonical_profile_id
  where assigned_to = alias_profile_id;

  update home_tasks.recurring_task_rules
  set created_by = canonical_profile_id
  where created_by = alias_profile_id;

  update home_tasks.task_templates
  set created_by = canonical_profile_id
  where created_by = alias_profile_id;

  update home_tasks.notifications
  set recipient_profile_id = canonical_profile_id
  where recipient_profile_id = alias_profile_id;

  update home_tasks.notifications
  set actor_profile_id = canonical_profile_id
  where actor_profile_id = alias_profile_id;

  update home_tasks.push_subscriptions
  set profile_id = canonical_profile_id
  where profile_id = alias_profile_id;

  update home_tasks.waste_bag_outings
  set marked_by = canonical_profile_id
  where marked_by = alias_profile_id;

  update home_tasks.waste_collection_days
  set created_by = canonical_profile_id
  where created_by = alias_profile_id;

  update home_tasks.household_members
  set profile_id = canonical_profile_id
  where profile_id = alias_profile_id;

  delete from home_tasks.profiles
  where id = alias_profile_id;
end
$$;
