#!/bin/bash
# ============================================================
# Loto Production Deployment Script
# Shares nginx with ChatLingua (external network)
#
# Usage:
#   ./scripts/deploy.sh              # Full deploy (build + start)
#   ./scripts/deploy.sh --restart    # Restart without rebuild
# ============================================================

set -e

LOTO_DIR="/opt/loto"
CHATLINGUA_DIR="/opt/chatlingua"
COMPOSE_FILE="docker-compose.prod.yml"
DOMAIN="${DOMAIN:-loto.dongquoctien.online}"

cd $LOTO_DIR

# Check if .env exists
if [ ! -f .env ]; then
    echo "ERROR: .env file not found!"
    echo "Please copy .env.production.example to .env and configure it."
    exit 1
fi

# Load environment
source .env

echo "=========================================="
echo "Loto Production Deployment"
echo "=========================================="
echo "Mode: Shared nginx with ChatLingua"
echo ""

# ------------------------------------------
# Pre-check: ChatLingua nginx must be running
# ------------------------------------------
if ! docker ps --format '{{.Names}}' | grep -q 'chatlingua-nginx'; then
    echo "ERROR: chatlingua-nginx container is not running!"
    echo "Loto shares nginx with ChatLingua. Start ChatLingua first."
    exit 1
fi

# ------------------------------------------
# Detect ChatLingua Docker network name
# ------------------------------------------
CHATLINGUA_NETWORK=$(docker inspect chatlingua-nginx --format '{{range $key, $val := .NetworkSettings.Networks}}{{$key}} {{end}}' | tr ' ' '\n' | head -1)
echo "ChatLingua network: $CHATLINGUA_NETWORK"
echo ""

if [ "$1" == "--restart" ]; then
    echo "Mode: Restart (no rebuild)"
    echo ""
    echo "Step 1: Restarting containers..."
    docker compose -f $COMPOSE_FILE restart
    echo ""
    echo "Step 2: Reloading ChatLingua nginx..."
    docker exec chatlingua-nginx nginx -s reload
    echo ""
    echo "Step 3: Checking status..."
    docker compose -f $COMPOSE_FILE ps
    echo ""
    echo "Restart complete!"
    exit 0
fi

echo "Mode: Full deployment (build + start)"

echo ""
echo "Step 1: Backup uploads from running container..."
BACKUP_DIR="$LOTO_DIR/backups/uploads-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
if docker ps --format '{{.Names}}' | grep -q 'loto-backend'; then
    docker cp loto-backend:/app/apps/backend/uploads/. "$BACKUP_DIR/" 2>/dev/null && \
        echo "  Backed up uploads to $BACKUP_DIR" || \
        echo "  No uploads to backup"
else
    echo "  Backend container not running, skipping backup"
fi

echo ""
echo "Step 2: Pulling latest code..."
git pull origin main

echo ""
echo "Step 3: Building Docker images..."
docker compose -f $COMPOSE_FILE build --no-cache

echo ""
echo "Step 4: Stopping old Loto containers..."
docker compose -f $COMPOSE_FILE down

echo ""
echo "Step 5: Copy nginx config to ChatLingua..."
cp $LOTO_DIR/nginx/conf.d/loto.conf $CHATLINGUA_DIR/nginx/conf.d/loto.conf
echo "  Copied loto.conf -> $CHATLINGUA_DIR/nginx/conf.d/"

echo ""
echo "Step 6: Starting Loto containers..."
docker compose -f $COMPOSE_FILE up -d

echo ""
echo "Step 7: Waiting for services to start..."
sleep 15

echo ""
echo "Step 8: Reloading ChatLingua nginx..."
docker exec chatlingua-nginx nginx -t && docker exec chatlingua-nginx nginx -s reload
echo "  Nginx config test + reload OK"

echo ""
echo "Step 9: Health check..."
docker compose -f $COMPOSE_FILE ps

# Check service health via ChatLingua nginx
echo ""
echo "Step 10: Verifying services..."

HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -H "Host: ${DOMAIN}" http://localhost/health 2>/dev/null || echo "000")
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -H "Host: ${DOMAIN}" http://localhost/api 2>/dev/null || echo "000")

echo "  Health (${DOMAIN}): HTTP $HEALTH_STATUS"
echo "  API    (${DOMAIN}): HTTP $API_STATUS"

if [ "$HEALTH_STATUS" != "200" ] && [ "$HEALTH_STATUS" != "301" ]; then
    echo ""
    echo "Warning: Services may not be healthy yet."
    echo "Check logs with: docker compose -f $COMPOSE_FILE logs -f"
fi

echo ""
echo "Step 11: Cleanup old images..."
docker image prune -f

echo ""
echo "=========================================="
echo "Deployment Complete!"
echo "=========================================="
echo ""
echo "Website: https://${DOMAIN}"
echo "API:     https://${DOMAIN}/api"
echo ""
echo "Useful commands:"
echo "  View logs:     docker compose -f $COMPOSE_FILE logs -f"
echo "  View backend:  docker compose -f $COMPOSE_FILE logs -f backend"
echo "  Restart:       ./scripts/deploy.sh --restart"
echo "  Stop:          docker compose -f $COMPOSE_FILE down"
echo "  DB shell:      docker exec -it loto-mysql mysql -u loto_user -p loto_db"
echo "  Nginx logs:    docker logs chatlingua-nginx --tail 50"
echo ""
