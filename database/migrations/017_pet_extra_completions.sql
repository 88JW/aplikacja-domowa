-- Planned slots remain unique; additional care can be recorded repeatedly.
alter table home_tasks.pet_task_completions
  drop constraint if exists pet_task_completions_slot_check;
alter table home_tasks.pet_task_completions
  add constraint pet_task_completions_slot_check
  check (slot in ('morning', 'evening', 'manual', 'extra'));
alter table home_tasks.pet_task_completions
  drop constraint if exists pet_task_completions_task_id_completion_date_slot_key;
create unique index if not exists pet_task_completions_planned_slot_idx
  on home_tasks.pet_task_completions (task_id, completion_date, slot)
  where slot <> 'extra';
