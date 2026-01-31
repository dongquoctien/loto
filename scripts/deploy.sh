#!/bin/bash
# ============================================================
# Loto Production Deployment Script
#
# Usage:
#   ./scripts/deploy.sh              # Full deploy (build + start)
#   ./scripts/deploy.sh --restart    # Restart without rebuild
# ============================================================

set -e

cd /opt/loto

# Check if .env exists
if [ ! -f .env ]; then
    echo "ERROR: .env file not found!"
    echo "Please copy .env.production.example to .env and configure it."
    exit 1
fi

# Load environment
source .env

COMPOSE_FILE="docker-compose.prod.yml"

echo "=========================================="
echo "Loto Production Deployment"
echo "=========================================="
echo ""

if [ "$1" == "--restart" ]; then
    echo "Mode: Restart (no rebuild)"
    echo ""
    echo "Step 1: Restarting containers..."
    docker compose -f $COMPOSE_FILE restart
    echo ""
    echo "Step 2: Checking status..."
    docker compose -f $COMPOSE_FILE ps
    echo ""
    echo "Restart complete!"
    exit 0
fi

echo "Mode: Full deployment (build + start)"

echo ""
echo "Step 1: Pulling latest code..."
git pull origin main

echo ""
echo "Step 2: Building Docker images..."
docker compose -f $COMPOSE_FILE build --no-cache

echo ""
echo "Step 3: Stopping old containers..."
docker compose -f $COMPOSE_FILE down

echo ""
echo "Step 4: Starting new containers..."
docker compose -f $COMPOSE_FILE up -d

echo ""
echo "Step 5: Waiting for services to start..."
sleep 15

echo ""
echo "Step 6: Health check..."
docker compose -f $COMPOSE_FILE ps

# Check service health
echo ""
echo "Step 7: Verifying services..."

# Check via nginx (port 80/443)
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/health 2>/dev/null || echo "000")
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/api 2>/dev/null || echo "000")

echo "  Health: HTTP $HEALTH_STATUS"
echo "  API:    HTTP $API_STATUS"

if [ "$HEALTH_STATUS" != "200" ]; then
    echo ""
    echo "Warning: Services may not be healthy yet."
    echo "Check logs with: docker compose -f $COMPOSE_FILE logs -f"
fi

echo ""
echo "Step 8: Cleanup old images..."
docker image prune -f

echo ""
echo "=========================================="
echo "Deployment Complete!"
echo "=========================================="
echo ""
echo "Website: https://loto.dongquoctien.online"
echo "API:     https://loto.dongquoctien.online/api"
echo ""
echo "Useful commands:"
echo "  View logs:     docker compose -f $COMPOSE_FILE logs -f"
echo "  View backend:  docker compose -f $COMPOSE_FILE logs -f backend"
echo "  Restart:       docker compose -f $COMPOSE_FILE restart"
echo "  Stop:          docker compose -f $COMPOSE_FILE down"
echo "  DB shell:      docker exec -it loto-mysql mysql -u loto_user -p loto_db"
echo ""
