# Quick Start Deployment Guide

## One-Command Deployment (First Time)

```bash
ssh root@85.198.64.93
cd /tmp
# Upload deploy.sh to server first, then:
chmod +x deploy.sh
./deploy.sh
```

## Daily Updates

```bash
ssh root@85.198.64.93
cd /var/www/livegrid
php artisan deploy
```

## Files Created

### 1. Nginx Configuration
**Location**: `deployment/nginx/dev.livegrid.ru.conf`
**Server Location**: `/etc/nginx/sites-available/dev.livegrid.ru`

### 2. Supervisor Configuration
**Location**: `deployment/supervisor/livegrid-queue-worker.conf`
**Server Location**: `/etc/supervisor/conf.d/livegrid-queue-worker.conf`

### 3. Deploy Command
**Location**: `app/Console/Commands/DeployCommand.php`
**Usage**: `php artisan deploy [--force] [--no-migrate]`

### 4. Deployment Script
**Location**: `deployment/deploy.sh`
**Usage**: Run on server as root

## Server Structure

```
/var/www/livegrid/          # Project root
├── app/
├── bootstrap/
├── config/
├── database/
├── frontend/               # Frontend build directory
├── public/                 # Web root
├── storage/
└── .env                    # Environment config
```

## Essential Commands

```bash
# Deploy updates
php artisan deploy

# Check queue workers
supervisorctl status livegrid-queue-worker:*

# View logs
tail -f storage/logs/laravel.log
tail -f storage/logs/queue-worker.log

# Restart services
systemctl restart nginx
systemctl restart php8.2-fpm
supervisorctl restart livegrid-queue-worker:*

# Clear caches
php artisan config:clear
php artisan route:clear
php artisan view:clear
```

## Verification Checklist

- [ ] Site accessible: https://dev.livegrid.ru
- [ ] SSL certificate valid
- [ ] Migrations applied: `php artisan migrate:status`
- [ ] Redis working: `redis-cli ping` (should return PONG)
- [ ] Queue workers running: `supervisorctl status`
- [ ] Logs are being written
