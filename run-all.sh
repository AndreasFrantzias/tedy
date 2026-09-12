#!/usr/bin/env bash
# Starts the full local setup: Postgres, the NestJS API, and the Angular app.
# It is safe to run more than once. Ctrl+C stops only the backend and frontend;
# the database container stays up so demo data is not lost between runs.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
CERTS_DIR="$BACKEND_DIR/certs"
ENV_FILE="$BACKEND_DIR/.env"

PG_CONTAINER="mat-postgres"
PG_PORT=55432
PG_DB="matdb"
PG_USER="postgres"
PG_PASSWORD="postgres"

BACKEND_LOG="/tmp/mat-backend.log"
FRONTEND_LOG="/tmp/mat-frontend.log"

log() { printf '\n\033[1;36m==> %s\033[0m\n' "$1"; }

ensure_node_deps() {
  local dir="$1"
  local label="$2"

  if [[ ! -d "$dir/node_modules" ]]; then
    log "Installing $label dependencies..."
    (cd "$dir" && npm install)
  elif [[ ! -f "$dir/node_modules/.package-lock.json" ]]; then
    log "Repairing $label dependencies..."
    (cd "$dir" && npm install)
  else
    log "$label dependencies already present."
  fi
}

ensure_running() {
  local pid="$1"
  local label="$2"
  local logfile="$3"

  if ! kill -0 "$pid" 2>/dev/null; then
    log "$label failed to start. Last log lines:"
    tail -n 80 "$logfile" || true
    exit 1
  fi
}

wait_for_url() {
  local url="$1"
  local pid="$2"
  local label="$3"
  local logfile="$4"
  local attempts="${5:-30}"

  for ((i = 1; i <= attempts; i++)); do
    ensure_running "$pid" "$label" "$logfile"
    if curl -kfsS "$url" >/dev/null 2>&1; then
      sleep 1
      ensure_running "$pid" "$label" "$logfile"
      return 0
    fi
    sleep 1
  done

  log "$label did not become ready at $url. Last log lines:"
  tail -n 80 "$logfile" || true
  exit 1
}

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

# 2. Local backend environment
if [[ ! -f "$ENV_FILE" ]]; then
  log "Creating backend/.env with local Docker database settings..."
  cat > "$ENV_FILE" <<EOF
DATABASE_URL="postgresql://$PG_USER:$PG_PASSWORD@localhost:$PG_PORT/$PG_DB"
DIRECT_DATABASE_URL="postgresql://$PG_USER:$PG_PASSWORD@localhost:$PG_PORT/$PG_DB"
JWT_SECRET="local-dev-secret-change-before-production"
SEED_ADMIN_PASSWORD="admin123"
PORT=3000
EOF
else
  log "backend/.env already present."
fi

# 3. TLS certs
if [[ ! -f "$CERTS_DIR/key.pem" || ! -f "$CERTS_DIR/cert.pem" ]]; then
  log "Generating self-signed dev TLS certs..."
  mkdir -p "$CERTS_DIR"
  openssl req -x509 -newkey rsa:2048 -keyout "$CERTS_DIR/key.pem" -out "$CERTS_DIR/cert.pem" \
    -days 365 -nodes -subj "/CN=localhost" 2>/dev/null
else
  log "TLS certs already present."
fi

# 4. Dependencies
ensure_node_deps "$BACKEND_DIR" "backend"
ensure_node_deps "$FRONTEND_DIR" "frontend"

if [[ "$(uname -s)" == "Darwin" ]]; then
  if [[ "$(uname -m)" == "arm64" && ( ! -d "$FRONTEND_DIR/node_modules/@rollup/rollup-darwin-arm64" || ! -d "$FRONTEND_DIR/node_modules/@esbuild/darwin-arm64" ) ]]; then
    log "Installing missing frontend native dependencies for macOS arm64..."
    (cd "$FRONTEND_DIR" && npm install --no-save @rollup/rollup-darwin-arm64 @esbuild/darwin-arm64)
  fi

  log "Rebuilding backend native dependencies for macOS..."
  (cd "$BACKEND_DIR" && npm rebuild bcrypt)
fi

# 5. Prisma client + schema
log "Generating Prisma client and applying migrations..."
(cd "$BACKEND_DIR" && npx prisma generate && npx prisma migrate deploy)

log "Seeding demo users and event..."
(cd "$BACKEND_DIR" && npm run prisma:seed)

# 6. Backend
log "Starting backend (https://localhost:3000) — logs: $BACKEND_LOG"
(cd "$BACKEND_DIR" && npm run start:dev) > "$BACKEND_LOG" 2>&1 &
BACKEND_PID=$!
wait_for_url "https://localhost:3000" "$BACKEND_PID" "Backend" "$BACKEND_LOG"

# 7. Frontend
log "Starting frontend (https://localhost:4200) — logs: $FRONTEND_LOG"
(cd "$FRONTEND_DIR" && npx ng serve --ssl --ssl-cert "$CERTS_DIR/cert.pem" --ssl-key "$CERTS_DIR/key.pem") \
  > "$FRONTEND_LOG" 2>&1 &
FRONTEND_PID=$!
wait_for_url "https://localhost:4200" "$FRONTEND_PID" "Frontend" "$FRONTEND_LOG" 45

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
