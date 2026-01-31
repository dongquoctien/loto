#!/bin/bash
# ============================================================
# Loto SSL Certificate Setup Script
# Uses ChatLingua's certbot and nginx (shared infrastructure)
# Run after DNS is configured and before first deploy
# ============================================================

set -e

LOTO_DIR="/opt/loto"
CHATLINGUA_DIR="/opt/chatlingua"

cd $LOTO_DIR

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
echo "(Using ChatLingua shared infrastructure)"
echo "=========================================="
echo ""
echo "Domain: ${DOMAIN}"
echo "Email:  ${EMAIL}"
echo ""

# ------------------------------------------
# Pre-check: ChatLingua nginx must be running
# ------------------------------------------
if ! docker ps --format '{{.Names}}' | grep -q 'chatlingua-nginx'; then
    echo "ERROR: chatlingua-nginx container is not running!"
    echo "Start ChatLingua first: cd $CHATLINGUA_DIR && docker compose up -d"
    exit 1
fi

# Step 1: Add temporary nginx config for ACME challenge
echo "Step 1: Adding temporary nginx config for SSL challenge..."

# Save loto.conf for ACME challenge only (HTTP, no SSL)
cat > $CHATLINGUA_DIR/nginx/conf.d/loto.conf << EOF
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
echo "Step 2: Reloading ChatLingua nginx with temporary config..."
docker exec chatlingua-nginx nginx -t && docker exec chatlingua-nginx nginx -s reload
sleep 3

# Verify nginx is responding for loto domain
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -H "Host: ${DOMAIN}" http://localhost 2>/dev/null || echo "000")
echo "  HTTP status for ${DOMAIN}: $HTTP_STATUS"

if [ "$HTTP_STATUS" != "200" ]; then
    echo "Warning: Nginx may not be ready. Waiting more..."
    sleep 5
fi

echo ""
echo "Step 3: Requesting SSL certificate from Let's Encrypt..."

# Use ChatLingua's certbot container to request cert
docker exec chatlingua-certbot certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email ${EMAIL} \
    --agree-tos \
    --no-eff-email \
    -d ${DOMAIN}

# If exec fails (certbot not running as daemon), try run
if [ $? -ne 0 ]; then
    echo "  Trying with docker run instead..."
    docker run --rm \
        -v ${CHATLINGUA_DIR}/certbot/conf:/etc/letsencrypt \
        -v ${CHATLINGUA_DIR}/certbot/www:/var/www/certbot \
        certbot/certbot certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --email ${EMAIL} \
        --agree-tos \
        --no-eff-email \
        -d ${DOMAIN}
fi

echo ""
echo "Step 4: Restoring full Loto nginx config..."
cp $LOTO_DIR/nginx/conf.d/loto.conf $CHATLINGUA_DIR/nginx/conf.d/loto.conf

echo ""
echo "Step 5: Testing nginx config..."
docker exec chatlingua-nginx nginx -t

echo ""
echo "=========================================="
echo "SSL Certificate Setup Complete!"
echo "=========================================="
echo ""
echo "Certificate: /etc/letsencrypt/live/${DOMAIN}/"
echo "(inside chatlingua-nginx container)"
echo ""
echo "Next step: Run ./scripts/deploy.sh to deploy Loto"
echo ""
