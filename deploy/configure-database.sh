#!/bin/sh
set -eu

database_container="supabase-db"
database_name="postgres"
admin_user="supabase_admin"
app_user="home_tasks_app"
password="$(openssl rand -hex 32)"

role_exists="$(
  docker exec "$database_container" \
    psql -U "$admin_user" -d "$database_name" -Atc \
    "select 1 from pg_roles where rolname = '$app_user'"
)"

if [ "$role_exists" != "1" ]; then
  printf 'create role %s login;\n' "$app_user" |
    docker exec -i "$database_container" \
      psql -v ON_ERROR_STOP=1 -U "$admin_user" -d "$database_name" >/dev/null
fi

printf "alter role %s with password '%s';\n" "$app_user" "$password" |
  docker exec -i "$database_container" \
    psql -v ON_ERROR_STOP=1 -U "$admin_user" -d "$database_name" >/dev/null

docker exec -i "$database_container" \
  psql -v ON_ERROR_STOP=1 -U "$admin_user" -d "$database_name" <<'SQL' >/dev/null
grant connect on database postgres to home_tasks_app;
grant usage on schema home_tasks to home_tasks_app;
grant select, insert, update, delete on all tables in schema home_tasks to home_tasks_app;
grant usage, select on all sequences in schema home_tasks to home_tasks_app;
grant execute on all functions in schema home_tasks to home_tasks_app;
alter default privileges in schema home_tasks
  grant select, insert, update, delete on tables to home_tasks_app;
alter default privileges in schema home_tasks
  grant usage, select on sequences to home_tasks_app;
alter default privileges in schema home_tasks
  grant execute on functions to home_tasks_app;
SQL

umask 077
printf 'postgresql://%s:%s@192.168.50.234:5432/%s\n' \
  "$app_user" "$password" "$database_name" > /tmp/homeapp-database-url

docker exec "$database_container" \
  psql -U "$admin_user" -d "$database_name" -Atc \
  "select table_name from information_schema.tables where table_schema = 'home_tasks' order by table_name"
