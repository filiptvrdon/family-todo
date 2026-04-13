#!/usr/bin/env bash
# backup.sh — dump the local Postgres database to a timestamped SQL file.
#
# Usage:
#   ./scripts/backup.sh [output-dir]
#
# Default output dir: ./backups
# Each dump is named: family-todo-YYYY-MM-DDTHH-MM-SS.sql
#
# To schedule daily backups with cron (runs at 02:00 every night):
#   crontab -e
#   0 2 * * * /path/to/family-todo/scripts/backup.sh >> /path/to/family-todo/backups/backup.log 2>&1
#
# Environment variables (defaults match docker-compose.yml):
#   PGHOST     (default: localhost)
#   PGPORT     (default: 5433)
#   PGUSER     (default: postgres)
#   PGPASSWORD (default: postgres)
#   PGDATABASE (default: family_todo)

set -euo pipefail

PGHOST="${PGHOST:-localhost}"
PGPORT="${PGPORT:-5433}"
PGUSER="${PGUSER:-postgres}"
PGPASSWORD="${PGPASSWORD:-postgres}"
PGDATABASE="${PGDATABASE:-family_todo}"

OUTPUT_DIR="${1:-$(dirname "$0")/../backups}"
mkdir -p "$OUTPUT_DIR"

TIMESTAMP="$(date -u +%Y-%m-%dT%H-%M-%S)"
OUTPUT_FILE="$OUTPUT_DIR/family-todo-${TIMESTAMP}.sql"

echo "[backup] Starting dump of ${PGDATABASE} → ${OUTPUT_FILE}"

PGPASSWORD="$PGPASSWORD" pg_dump \
  --host="$PGHOST" \
  --port="$PGPORT" \
  --username="$PGUSER" \
  --no-password \
  --format=plain \
  --no-owner \
  --no-privileges \
  "$PGDATABASE" > "$OUTPUT_FILE"

SIZE="$(du -sh "$OUTPUT_FILE" | cut -f1)"
echo "[backup] Done. ${OUTPUT_FILE} (${SIZE})"

# Keep only the 30 most recent backups
BACKUP_COUNT="$(ls -1 "$OUTPUT_DIR"/family-todo-*.sql 2>/dev/null | wc -l | tr -d ' ')"
if [ "$BACKUP_COUNT" -gt 30 ]; then
  ls -1t "$OUTPUT_DIR"/family-todo-*.sql | tail -n +"$((30 + 1))" | while read -r OLD; do
    echo "[backup] Removing old backup: $OLD"
    rm "$OLD"
  done
fi
