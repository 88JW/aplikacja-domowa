alter table home_tasks.waste_collection_days
  drop constraint if exists waste_collection_days_collection_kind_check;

alter table home_tasks.waste_collection_days
  add constraint waste_collection_days_collection_kind_check
  check (collection_kind in ('all', 'bio_residual', 'bio'));
