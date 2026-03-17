#!/bin/bash

# Verification Script for Production Deployment
# Run this after deployment to verify everything works

set -e

PROJECT_DIR="/var/www/livegrid"
DOMAIN="dev.livegrid.ru"

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

echo "🔍 Verifying Deployment"
echo "======================"

cd $PROJECT_DIR

echo ""
echo "1. Checking Laravel"
echo "-------------------"

if php artisan --version > /dev/null 2>&1; then
    VERSION=$(php artisan --version)
    print_status "Laravel: $VERSION"
else
    print_error "Laravel not working"
    exit 1
fi

echo ""
echo "2. Checking Database Connection"
echo "-------------------------------"

if php artisan migrate:status > /dev/null 2>&1; then
    print_status "Database connection OK"
    php artisan migrate:status | head -20
else
    print_error "Database connection failed"
    exit 1
fi

echo ""
echo "3. Checking Tables"
echo "------------------"

TABLES=$(php artisan tinker --execute="echo DB::select('SHOW TABLES');" 2>/dev/null | grep -c "Table" || echo "0")

if [ "$TABLES" -gt "0" ]; then
    print_status "Tables exist"
else
    print_warning "No tables found"
fi

echo ""
echo "4. Checking Permissions"
echo "----------------------"

if [ -w "$PROJECT_DIR/storage" ]; then
    print_status "Storage directory is writable"
else
    print_error "Storage directory is not writable"
fi

if [ -w "$PROJECT_DIR/bootstrap/cache" ]; then
    print_status "Bootstrap cache is writable"
else
    print_error "Bootstrap cache is not writable"
fi

echo ""
echo "5. Checking Nginx"
echo "----------------"

if systemctl is-active --quiet nginx; then
    print_status "Nginx is running"
else
    print_error "Nginx is not running"
fi

if curl -s -o /dev/null -w "%{http_code}" https://$DOMAIN | grep -q "200\|301\|302"; then
    print_status "Site is accessible via HTTPS"
else
    print_warning "Site may not be accessible"
fi

echo ""
echo "6. Checking Redis"
echo "----------------"

if redis-cli ping > /dev/null 2>&1; then
    print_status "Redis is running"
else
    print_error "Redis is not running"
fi

echo ""
echo "7. Checking Queue Workers"
echo "------------------------"

if supervisorctl status livegrid-queue-worker:* > /dev/null 2>&1; then
    print_status "Queue workers configured"
    supervisorctl status livegrid-queue-worker:*
else
    print_warning "Queue workers not found"
fi

echo ""
echo "8. Checking Logs"
echo "---------------"

if [ -f "$PROJECT_DIR/storage/logs/laravel.log" ]; then
    ERROR_COUNT=$(tail -100 $PROJECT_DIR/storage/logs/laravel.log | grep -c "ERROR" || echo "0")
    if [ "$ERROR_COUNT" -eq "0" ]; then
        print_status "No recent errors in logs"
    else
        print_warning "Found $ERROR_COUNT errors in recent logs"
    fi
else
    print_warning "Log file not found"
fi

echo ""
echo "======================"
echo "✅ Verification completed"
