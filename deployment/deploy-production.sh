#!/bin/bash

# Production Deployment Script for dev.livegrid.ru
# Server: 85.198.64.93
# Domain: dev.livegrid.ru

set -e

echo "🚀 Starting Production Deployment"
echo "=================================="

PROJECT_DIR="/var/www/livegrid"
DOMAIN="dev.livegrid.ru"
DB_NAME="livegrid"
DB_USER="livegrid"

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
echo "STEP 1: Project Preparation"
echo "--------------------------"

if [ ! -d "$PROJECT_DIR" ]; then
    print_warning "Project directory not found. Cloning repository..."
    mkdir -p $PROJECT_DIR
    cd $PROJECT_DIR
    git clone https://github.com/letoceiling-coder/livegrid.git .
    print_status "Repository cloned"
else
    print_status "Project directory exists"
    cd $PROJECT_DIR
fi

if [ ! -f "composer.json" ]; then
    print_error "composer.json not found. Please check repository."
    exit 1
fi

print_warning "Installing/updating dependencies..."
composer install --no-dev --optimize-autoloader --no-interaction
print_status "Dependencies installed"

echo ""
echo "STEP 2: Environment Configuration"
echo "----------------------------------"

if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        print_status ".env created from .env.example"
    else
        print_error ".env.example not found"
        exit 1
    fi
fi

# Update .env with production settings
print_warning "Configuring .env..."
sed -i 's/APP_ENV=.*/APP_ENV=production/' .env
sed -i 's/APP_DEBUG=.*/APP_DEBUG=false/' .env
sed -i "s|APP_URL=.*|APP_URL=https://${DOMAIN}|" .env
sed -i 's/CACHE_DRIVER=.*/CACHE_DRIVER=redis/' .env
sed -i 's/QUEUE_CONNECTION=.*/QUEUE_CONNECTION=redis/' .env

# Generate app key if not set
if ! grep -q "APP_KEY=base64:" .env; then
    print_warning "Generating application key..."
    php artisan key:generate --force
    print_status "Application key generated"
fi

print_status ".env configured"
print_warning "⚠️  Please manually configure DB_* and REDIS_* settings in .env"

echo ""
echo "STEP 3: Database Setup"
echo "----------------------"

print_warning "Creating MySQL database..."
read -p "Enter MySQL root password: " MYSQL_ROOT_PASSWORD

mysql -u root -p"$MYSQL_ROOT_PASSWORD" <<EOF
CREATE DATABASE IF NOT EXISTS ${DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_USER}_password_change_me';
GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';
FLUSH PRIVILEGES;
EOF

print_status "Database created"
print_warning "⚠️  Please update DB_USERNAME and DB_PASSWORD in .env"

echo ""
echo "STEP 4: Run Migrations"
echo "----------------------"

php artisan migrate --force
print_status "Migrations completed"

php artisan migrate:status
print_status "Migration status checked"

echo ""
echo "STEP 5: Set Permissions"
echo "-----------------------"

chown -R www-data:www-data $PROJECT_DIR
chmod -R 755 $PROJECT_DIR
chmod -R 775 $PROJECT_DIR/storage
chmod -R 775 $PROJECT_DIR/bootstrap/cache
print_status "Permissions set"

echo ""
echo "STEP 6: Nginx Configuration"
echo "----------------------------"

NGINX_CONFIG="/etc/nginx/sites-available/${DOMAIN}"

if [ ! -f "$NGINX_CONFIG" ]; then
    print_warning "Creating Nginx configuration..."
    # Configuration should be created from deployment/nginx/dev.livegrid.ru.conf
    print_warning "Please copy nginx config from deployment/nginx/dev.livegrid.ru.conf"
else
    print_status "Nginx configuration exists"
fi

# Test and reload nginx
nginx -t && systemctl reload nginx
print_status "Nginx reloaded"

echo ""
echo "STEP 7: SSL Certificate"
echo "----------------------"

if [ ! -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
    print_warning "Installing SSL certificate..."
    certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@${DOMAIN} --redirect
    print_status "SSL certificate installed"
else
    print_status "SSL certificate exists"
fi

echo ""
echo "STEP 8: Redis & Queue"
echo "---------------------"

# Check Redis
if redis-cli ping > /dev/null 2>&1; then
    print_status "Redis is running"
else
    print_warning "Starting Redis..."
    systemctl start redis-server
    systemctl enable redis-server
    print_status "Redis started"
fi

# Supervisor
SUPERVISOR_CONFIG="/etc/supervisor/conf.d/livegrid-queue-worker.conf"

if [ ! -f "$SUPERVISOR_CONFIG" ]; then
    print_warning "Creating Supervisor configuration..."
    # Copy from deployment/supervisor/livegrid-queue-worker.conf
    print_warning "Please copy supervisor config from deployment/supervisor/livegrid-queue-worker.conf"
else
    supervisorctl reread
    supervisorctl update
    supervisorctl start livegrid-queue-worker:* || true
    print_status "Queue workers configured"
fi

echo ""
echo "STEP 9: Cache Configuration"
echo "---------------------------"

php artisan config:cache
php artisan route:cache
php artisan view:cache
print_status "Configuration cached"

echo ""
echo "STEP 10: Deploy Command"
echo "-----------------------"

php artisan deploy --force
print_status "Deploy command completed"

echo ""
echo "=================================="
echo "✅ Deployment completed!"
echo ""
echo "Next steps:"
echo "1. Verify site: https://${DOMAIN}"
echo "2. Test import system"
echo "3. Check logs: tail -f ${PROJECT_DIR}/storage/logs/laravel.log"
echo "=================================="
