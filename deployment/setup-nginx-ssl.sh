#!/bin/bash

# Setup Nginx and SSL for dev.livegrid.ru
# Server: 85.198.64.93
# Domain: dev.livegrid.ru

set -e

PROJECT_DIR="/var/www/livegrid"
DOMAIN="dev.livegrid.ru"
NGINX_SITES_AVAILABLE="/etc/nginx/sites-available"
NGINX_SITES_ENABLED="/etc/nginx/sites-enabled"
NGINX_CONFIG="$NGINX_SITES_AVAILABLE/$DOMAIN"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    print_error "Please run as root"
    exit 1
fi

echo ""
echo "=================================="
echo "NGINX & SSL Setup for $DOMAIN"
echo "=================================="
echo ""

# STEP 1: Check DNS
echo "STEP 1: Checking DNS..."
DNS_IP=$(dig +short $DOMAIN | tail -n1)
SERVER_IP=$(curl -s ifconfig.me || curl -s ipinfo.io/ip)

if [ -z "$DNS_IP" ]; then
    print_error "DNS record not found for $DOMAIN"
    print_warning "Please ensure DNS A record points to server IP: $SERVER_IP"
    exit 1
fi

print_status "DNS record found: $DOMAIN -> $DNS_IP"
print_warning "Server IP: $SERVER_IP"
print_warning "If DNS IP doesn't match server IP, update DNS records"

echo ""
read -p "Continue with nginx setup? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

# STEP 2: Copy nginx config
echo ""
echo "STEP 2: Setting up Nginx configuration..."

if [ ! -f "$PROJECT_DIR/deployment/nginx/$DOMAIN.conf" ]; then
    print_error "Nginx config not found: $PROJECT_DIR/deployment/nginx/$DOMAIN.conf"
    exit 1
fi

# Copy config to nginx sites-available
cp "$PROJECT_DIR/deployment/nginx/$DOMAIN.conf" "$NGINX_CONFIG"
print_status "Nginx config copied to $NGINX_CONFIG"

# Create symlink if it doesn't exist
if [ ! -L "$NGINX_SITES_ENABLED/$DOMAIN" ]; then
    ln -s "$NGINX_CONFIG" "$NGINX_SITES_ENABLED/$DOMAIN"
    print_status "Symlink created: $NGINX_SITES_ENABLED/$DOMAIN"
else
    print_status "Symlink already exists"
fi

# Test nginx configuration
echo ""
print_warning "Testing nginx configuration..."
if nginx -t; then
    print_status "Nginx configuration is valid"
else
    print_error "Nginx configuration test failed"
    exit 1
fi

# Reload nginx
systemctl reload nginx
print_status "Nginx reloaded"

# STEP 3: Install SSL
echo ""
echo "STEP 3: Installing SSL certificate..."

# Check if certbot is installed
if ! command -v certbot &> /dev/null; then
    print_warning "Certbot not found. Installing..."
    apt-get update
    apt-get install -y certbot python3-certbot-nginx
    print_status "Certbot installed"
fi

# Check if certificate already exists
if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    print_status "SSL certificate already exists"
    read -p "Renew certificate? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        certbot renew --nginx -d $DOMAIN --non-interactive
        print_status "Certificate renewed"
    fi
else
    print_warning "Installing SSL certificate..."
    print_warning "You will be prompted for email address"
    
    certbot --nginx -d $DOMAIN --non-interactive --agree-tos --redirect
    
    if [ $? -eq 0 ]; then
        print_status "SSL certificate installed successfully"
    else
        print_error "SSL certificate installation failed"
        print_warning "Make sure DNS is pointing to this server"
        exit 1
    fi
fi

# STEP 4: Verify configuration
echo ""
echo "STEP 4: Verifying configuration..."

# Test nginx again after SSL
nginx -t && systemctl reload nginx
print_status "Nginx reloaded after SSL setup"

# Check SSL certificate
if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    CERT_EXPIRY=$(openssl x509 -enddate -noout -in /etc/letsencrypt/live/$DOMAIN/fullchain.pem | cut -d= -f2)
    print_status "SSL certificate expires: $CERT_EXPIRY"
fi

# STEP 5: Final verification
echo ""
echo "STEP 5: Final verification..."

# Check if site is accessible
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN" || echo "000")

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "301" ] || [ "$HTTP_CODE" = "302" ]; then
    print_status "Site is accessible via HTTPS (HTTP code: $HTTP_CODE)"
else
    print_warning "Site returned HTTP code: $HTTP_CODE"
    print_warning "This might be normal if frontend is not built yet"
fi

echo ""
echo "=================================="
echo "✅ Setup completed!"
echo ""
echo "Next steps:"
echo "1. Verify site: https://$DOMAIN"
echo "2. Check nginx logs: tail -f /var/log/nginx/$DOMAIN-error.log"
echo "3. Build frontend: cd $PROJECT_DIR/frontend && npm install && npm run build"
echo "4. Test API: curl https://$DOMAIN/api/v1/user"
echo "=================================="
