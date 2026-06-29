#!/usr/bin/env bash
# Deploy UbiLaundry and clean up old Docker images.
# Usage: ./deploy.sh [--no-cache]
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
COMPOSE="docker compose -f $REPO_DIR/docker-compose.yml"
NO_CACHE=""

for arg in "$@"; do
  case $arg in
    --no-cache) NO_CACHE="--no-cache" ;;
    *) echo "Unknown argument: $arg"; exit 1 ;;
  esac
done

log() { echo "[$(date '+%H:%M:%S')] $*"; }

log "=== UbiLaundry deploy ==="

# ── 1. Pull latest code ───────────────────────────────────────────────────────
log "Pulling latest code..."
git -C "$REPO_DIR" pull

VERSION=$(node -p "require('$REPO_DIR/package.json').version" 2>/dev/null || echo "unknown")
log "App version: $VERSION"

# ── 2. Record the current image ID so we can remove it after the swap ────────
OLD_IMAGE=$($COMPOSE images -q app 2>/dev/null | head -1 || true)

# ── 3. Build new image ────────────────────────────────────────────────────────
log "Building new image${NO_CACHE:+ (no cache)}..."
$COMPOSE build $NO_CACHE

# ── 4. Restart container (compose replaces the old one in-place) ──────────────
log "Starting updated container..."
$COMPOSE up -d --remove-orphans

# ── 5. Remove the previous image if it is no longer used ─────────────────────
if [ -n "$OLD_IMAGE" ]; then
  STILL_USED=$(docker ps -q --filter "ancestor=$OLD_IMAGE" 2>/dev/null || true)
  if [ -z "$STILL_USED" ]; then
    log "Removing previous image ($OLD_IMAGE)..."
    docker rmi "$OLD_IMAGE" 2>/dev/null && log "Removed." || log "Already gone."
  else
    log "Previous image still in use by another container — skipping removal."
  fi
fi

# ── 6. Prune dangling build layers left by the new build ─────────────────────
log "Pruning dangling images..."
docker image prune -f

# ── 7. Status ─────────────────────────────────────────────────────────────────
log "=== Deploy complete ==="
$COMPOSE ps
echo ""
docker system df
