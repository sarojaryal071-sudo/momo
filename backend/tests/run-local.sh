#!/usr/bin/env bash
# Runs the migrations and the database tests on a throw-away local PostgreSQL (no Supabase account needed).
# Usage: backend/tests/run-local.sh            (needs PostgreSQL 14+ installed; as root it runs the server as the postgres user)
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
MIG="$HERE/../supabase/migrations"
BIN="$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1 || true)"
[ -n "$BIN" ] || { echo "PostgreSQL server binaries not found"; exit 2; }
DIR="$(mktemp -d)"; chmod 755 "$DIR"
RUN=""; if [ "$(id -u)" = 0 ]; then chown postgres "$DIR"; RUN="runuser -u postgres --"; fi
PORT="${PGTESTPORT:-54329}"
cleanup() { $RUN "$BIN/pg_ctl" -D "$DIR/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$DIR"; }
trap cleanup EXIT
$RUN "$BIN/initdb" -D "$DIR/data" -A trust -U postgres >/dev/null
$RUN "$BIN/pg_ctl" -D "$DIR/data" -o "-p $PORT -k $DIR -c listen_addresses=''" -l "$DIR/log" -w start >/dev/null
PSQL="psql -h $DIR -p $PORT -U postgres -v ON_ERROR_STOP=1 -q"
export PGHOST="$DIR" PGPORT="$PORT" PGUSER=postgres
$PSQL -d postgres -c "create database t" >/dev/null
$PSQL -d t -f "$HERE/shim_supabase.sql"
for f in "$MIG"/*.sql; do $PSQL -d t -f "$f"; done
echo "migrations applied: $(ls "$MIG" | wc -l) files"
# applying the migrations a second time on top must fail cleanly at the first create (forward-only), but the seed must be repeatable
$PSQL -d t -f "$MIG/0004_seed_shop_data.sql"
echo "seed re-run ok"
psql -h "$DIR" -p "$PORT" -U postgres -d t -q -t -A -v ON_ERROR_STOP=1 -f "$HERE/policies.test.sql" 2>&1 | sed -e 's/^psql:[^ ]* NOTICE:  //' -e '/^$/d'; [ "${PIPESTATUS[0]}" = 0 ] || exit 1
bash ${CONC_DEBUG:+-x} "$HERE/concurrency.sh" "$DIR" "$PORT"
echo "ALL DATABASE TESTS PASSED"
