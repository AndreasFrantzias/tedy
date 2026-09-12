#!/usr/bin/env bash
# Starts the whole stack: Postgres (Docker), NestJS backend, Angular frontend.
# Re-run anytime — every step is idempotent. Ctrl+C stops backend + frontend
# (the Postgres container keeps running so your data persists).

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
CERTS_DIR="$BACKEND_DIR/certs"

PG_CONTAINER="mat-postgres"
PG_PORT=55432
PG_DB="matdb"
PG_USER="postgres"
PG_PASSWORD="postgres"

BACKEND_LOG="/tmp/mat-backend.log"
FRONTEND_LOG="/tmp/mat-frontend.log"

log() { printf '\n\033[1;36m==> %s\033[0m\n' "$1"; }

cleanup() {
  log "Stopping backend and frontend..."
  [[ -n "${BACKEND_PID:-}" ]] && kill "$BACKEND_PID" 2>/dev/null || true
  [[ -n "${FRONTEND_PID:-}" ]] && kill "$FRONTEND_PID" 2>/dev/null || true
  wait 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# 1. Postgres container
log "Checking Postgres container ($PG_CONTAINER)..."
if ! docker info >/dev/null 2>&1; then
  log "Docker daemon not running — starting Docker Desktop..."
  open -a Docker
  until docker info >/dev/null 2>&1; do sleep 1; done
fi

if docker ps -a --format '{{.Names}}' | grep -qx "$PG_CONTAINER"; then
  if ! docker ps --format '{{.Names}}' | grep -qx "$PG_CONTAINER"; then
    log "Starting existing Postgres container..."
    docker start "$PG_CONTAINER" >/dev/null
  else
    log "Postgres container already running."
  fi
else
  log "Creating Postgres container..."
  docker run -d --name "$PG_CONTAINER" \
    -e POSTGRES_USER="$PG_USER" \
    -e POSTGRES_PASSWORD="$PG_PASSWORD" \
    -e POSTGRES_DB="$PG_DB" \
    -p "$PG_PORT":5432 \
    postgres:16-alpine >/dev/null
fi

log "Waiting for Postgres to accept connections..."
until docker exec "$PG_CONTAINER" pg_isready -U "$PG_USER" >/dev/null 2>&1; do sleep 1; done

# 2. TLS certs
if [[ ! -f "$CERTS_DIR/key.pem" || ! -f "$CERTS_DIR/cert.pem" ]]; then
  log "Generating self-signed dev TLS certs..."
  mkdir -p "$CERTS_DIR"
  openssl req -x509 -newkey rsa:2048 -keyout "$CERTS_DIR/key.pem" -out "$CERTS_DIR/cert.pem" \
    -days 365 -nodes -subj "/CN=localhost" 2>/dev/null
else
  log "TLS certs already present."
fi

# 3. Dependencies
if [[ ! -d "$BACKEND_DIR/node_modules" ]]; then
  log "Installing backend dependencies..."
  (cd "$BACKEND_DIR" && npm install)
fi
if [[ ! -d "$FRONTEND_DIR/node_modules" ]]; then
  log "Installing frontend dependencies..."
  (cd "$FRONTEND_DIR" && npm install)
fi

# 4. Prisma client + schema
log "Generating Prisma client and applying migrations..."
(cd "$BACKEND_DIR" && npx prisma generate && npx prisma migrate deploy)

# 5. Backend
log "Starting backend (https://localhost:3000) — logs: $BACKEND_LOG"
(cd "$BACKEND_DIR" && npm run start:dev) > "$BACKEND_LOG" 2>&1 &
BACKEND_PID=$!

# 6. Frontend
log "Starting frontend (https://localhost:4200) — logs: $FRONTEND_LOG"
(cd "$FRONTEND_DIR" && npx ng serve --ssl --ssl-cert "$CERTS_DIR/cert.pem" --ssl-key "$CERTS_DIR/key.pem") \
  > "$FRONTEND_LOG" 2>&1 &
FRONTEND_PID=$!

cat <<EOF

-----------------------------------------------------------------
  Backend:   https://localhost:3000
  Frontend:  https://localhost:4200

  Demo accounts:
    admin      / admin123      (administrator)
    organizer  / organizer123  (sample organizer)
    user       / user1234      (sample attendee)

  Logs: $BACKEND_LOG | $FRONTEND_LOG
  Press Ctrl+C to stop backend + frontend (Postgres container keeps running).
-----------------------------------------------------------------
EOF

wait
