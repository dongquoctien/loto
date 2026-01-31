#!/bin/bash
# ============================================================
# Loto SSL Certificate Setup Script
# Run after DNS is configured and before first deploy
# ============================================================

set -e

cd /opt/loto

# Load environment
if [ ! -f .env ]; then
    echo "ERROR: .env file not found!"
    echo "Please copy .env.production.example to .env and configure it."
    exit 1
fi
source .env

DOMAIN="${DOMAIN:-loto.dongquoctien.online}"
EMAIL="${SSL_EMAIL:-admin@dongquoctien.online}"

echo "=========================================="
echo "Loto SSL Certificate Setup"
echo "=========================================="
echo ""
echo "Domain: ${DOMAIN}"
echo "Email:  ${EMAIL}"
echo ""

# Create directories
mkdir -p certbot/conf certbot/www

# Step 1: Create temporary nginx config for SSL challenge
echo "Step 1: Creating temporary nginx config..."
mkdir -p nginx/conf.d

# Backup original config
if [ -f nginx/conf.d/loto.conf ]; then
    cp nginx/conf.d/loto.conf nginx/conf.d/loto.conf.bak
fi

cat > nginx/conf.d/loto.conf << EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 200 'Loto SSL setup in progress...';
        add_header Content-Type text/plain;
    }
}
EOF

echo ""
echo "Step 2: Starting nginx for SSL challenge..."
docker compose -f docker-compose.prod.yml up -d nginx

echo ""
echo "Step 3: Waiting for nginx to start..."
sleep 5

# Verify nginx is responding
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost 2>/dev/null || echo "000")
if [ "$HTTP_STATUS" != "200" ]; then
    echo "Warning: Nginx may not be ready (HTTP $HTTP_STATUS). Waiting more..."
    sleep 5
fi

echo ""
echo "Step 4: Requesting SSL certificate from Let's Encrypt..."
docker compose -f docker-compose.prod.yml run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email ${EMAIL} \
    --agree-tos \
    --no-eff-email \
    -d ${DOMAIN}

echo ""
echo "Step 5: Restoring full nginx config..."
# Restore original config
if [ -f nginx/conf.d/loto.conf.bak ]; then
    mv nginx/conf.d/loto.conf.bak nginx/conf.d/loto.conf
else
    # If no backup, restore from git
    git checkout nginx/conf.d/loto.conf 2>/dev/null || echo "Warning: Could not restore config from git"
fi

echo ""
echo "Step 6: Stopping temporary nginx..."
docker compose -f docker-compose.prod.yml down

echo ""
echo "=========================================="
echo "SSL Certificate Setup Complete!"
echo "=========================================="
echo ""
echo "Certificate: /opt/loto/certbot/conf/live/${DOMAIN}/"
echo ""
echo "Next step: Run ./scripts/deploy.sh to deploy the full application"
echo ""
