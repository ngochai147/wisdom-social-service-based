#!/usr/bin/env bash
# Chay tat ca service-base local (khong Docker). Moi service 1 cua so nen (background).
# Dung Ctrl+C de dung tat ca. Log ghi ra service-base/logs/<service>.log
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

mkdir -p logs

# Nap bien moi truong tu .env neu co
if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

SERVICES=(
  "media-service:8081"
  "user-chat-service:8082"
  "content-service:8083"
  "notification-service:8084"
  "ai-service:8085"
  "gateway-service:8080"
)

PIDS=()

cleanup() {
  echo
  echo "==> Dang dung tat ca service..."
  for pid in "${PIDS[@]:-}"; do
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
    fi
  done
  wait 2>/dev/null || true
  echo "==> Da dung het."
}
trap cleanup INT TERM

echo "==> Build toan bo (skip test)..."
./mvnw -q -DskipTests install

for entry in "${SERVICES[@]}"; do
  name="${entry%%:*}"
  port="${entry##*:}"
  echo "==> Start $name tren port $port ..."
  (
    cd "$name"
    SERVER_PORT="$port" ../mvnw -q spring-boot:run
  ) > "logs/$name.log" 2>&1 &
  PIDS+=("$!")
done

echo "==> Da start ${#SERVICES[@]} service. Gateway o http://localhost:8080 (frontend-web tro vao day). Log o service-base/logs/. Ctrl+C de dung."
wait
