#!/bin/bash
# Imports a data dump into the local Docker PostgreSQL instance.
# Prerequisites: Docker container must be running (docker compose up -d).
set -e

DUMP_FILE="${1:-/tmp/family_todo_remote.sql}"
LOCAL_DB="postgresql://postgres:postgres@localhost:5433/family_todo"

if [ ! -f "$DUMP_FILE" ]; then
  echo "Error: dump file not found: $DUMP_FILE"
  echo "  Run './scripts/db-dump-remote.sh' first."
  exit 1
fi

echo "=== Import $DUMP_FILE → local Docker DB ==="
echo ""

# Verify Docker container is up
if ! psql "$LOCAL_DB" -c "SELECT 1" &>/dev/null 2>&1; then
  echo "Error: cannot connect to local DB. Is the Docker container running?"
  echo "  Run: docker compose up -d"
  exit 1
fi

echo "Importing data (FK checks disabled during load)…"
psql "$LOCAL_DB" -v ON_ERROR_STOP=0 <<SQL
SET session_replication_role = replica;
$(cat "$DUMP_FILE")
SET session_replication_role = DEFAULT;
SQL

echo ""
echo "✓ Import complete. Verifying row counts:"
psql "$LOCAL_DB" -c "
  SELECT 'users'          AS tbl, COUNT(*) FROM users
  UNION ALL
  SELECT 'todos',                  COUNT(*) FROM todos
  UNION ALL
  SELECT 'quests',                 COUNT(*) FROM quests
  UNION ALL
  SELECT 'habits',                 COUNT(*) FROM habits
  UNION ALL
  SELECT 'calendar_events',        COUNT(*) FROM calendar_events
  ORDER BY tbl;
"
