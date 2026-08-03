#!/bin/sh
set -eu

backup_dir="/home/wojciech/backups/homeapp"
timestamp="$(date +%Y-%m-%d_%H-%M-%S)"
target="$backup_dir/home_tasks_$timestamp.dump"
temporary="$target.tmp"

mkdir -p "$backup_dir"
umask 077

ssh -o BatchMode=yes server234 \
  "docker exec supabase-db pg_dump \
    -U supabase_admin \
    -d postgres \
    -n home_tasks \
    --format=custom \
    --no-owner \
    --no-privileges" > "$temporary"

test -s "$temporary"
mv "$temporary" "$target"
sha256sum "$target" > "$target.sha256"

find "$backup_dir" -type f -name 'home_tasks_*.dump' -mtime +30 -delete
find "$backup_dir" -type f -name 'home_tasks_*.dump.sha256' -mtime +30 -delete
