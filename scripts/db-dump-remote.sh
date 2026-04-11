#!/bin/bash
# Dumps data-only from the remote Supabase PostgreSQL instance.
# Run once (or whenever you want to re-sync remote → local).
#
# You need the database password from:
# Supabase Dashboard → Settings → Database → Connection string
# (the password in: postgres://postgres:[PASSWORD]@db.xxx.supabase.co)
set -e

PROJECT_REF="vgexdxzairxivlikwgqy"
REMOTE_HOST="db.${PROJECT_REF}.supabase.co"
REMOTE_PORT="5432"
REMOTE_DB="postgres"
REMOTE_USER="postgres"
DUMP_FILE="${1:-/tmp/family_todo_remote.sql}"

echo "=== Dump remote Supabase → $DUMP_FILE ==="
echo ""
read -s -p "Supabase DB password: " PGPASSWORD
echo ""
export PGPASSWORD

echo "Connecting to $REMOTE_HOST…"
pg_dump \
  --host="$REMOTE_HOST" \
  --port="$REMOTE_PORT" \
  --username="$REMOTE_USER" \
  --dbname="$REMOTE_DB" \
  --schema=public \
  --data-only \
  --no-owner \
  --no-privileges \
  --no-comments \
  --disable-triggers \
  --file="$DUMP_FILE"

unset PGPASSWORD

echo "✓ Dump saved to $DUMP_FILE"
echo "  Run './scripts/db-import-local.sh $DUMP_FILE' to load it into Docker."
