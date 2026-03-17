# Laravel Production Deployment Guide

## Server Information
- **SSH**: root@85.198.64.93
- **Domain**: dev.livegrid.ru
- **Repository**: https://github.com/letoceiling-coder/livegrid.git
- **Project Path**: /var/www/livegrid

## Quick Start

### Automated Deployment (First Time)

1. **Connect to server:**
   ```bash
   ssh root@85.198.64.93
   ```

2. **Upload and run deployment script:**
   ```bash
   # Upload deploy.sh to server
   chmod +x deploy.sh
   ./deploy.sh
   ```

3. **Manual steps during deployment:**
   - Configure database credentials in `.env`
   - Create MySQL database when prompted
   - Verify all services are running

### Manual Deployment Steps

#### Step 1: Server Preparation
```bash
# Install required software (if not already installed)
apt-get update
apt-get install -y php8.2 php8.2-fpm php8.2-cli php8.2-mysql php8.2-xml \
    php8.2-mbstring php8.2-curl php8.2-zip php8.2-gd php8.2-redis \
    php8.2-bcmath nginx mysql-server redis-server supervisor nodejs composer
```

#### Step 2: Project Setup
```bash
mkdir -p /var/www/livegrid
cd /var/www/livegrid
git clone https://github.com/letoceiling-coder/livegrid.git .
chown -R www-data:www-data /var/www/livegrid
chmod -R 755 /var/www/livegrid
chmod -R 775 /var/www/livegrid/storage
chmod -R 775 /var/www/livegrid/bootstrap/cache
```

#### Step 3: Environment Configuration
```bash
cd /var/www/livegrid
cp .env.example .env
nano .env  # Configure database, redis, etc.
php artisan key:generate
```

Required `.env` settings:
```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://dev.livegrid.ru
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_DATABASE=livegrid
DB_USERNAME=livegrid
DB_PASSWORD=your_password
CACHE_DRIVER=redis
QUEUE_CONNECTION=redis
REDIS_HOST=127.0.0.1
REDIS_PASSWORD=null
REDIS_PORT=6379
```

#### Step 4: Nginx Configuration
```bash
# Copy nginx config
cp deployment/nginx/dev.livegrid.ru.conf /etc/nginx/sites-available/dev.livegrid.ru
ln -s /etc/nginx/sites-available/dev.livegrid.ru /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

#### Step 5: SSL Certificate
```bash
apt-get install -y certbot python3-certbot-nginx
certbot --nginx -d dev.livegrid.ru --non-interactive --agree-tos --email admin@dev.livegrid.ru
```

#### Step 6: Database Setup
```bash
mysql -u root -p
```
```sql
CREATE DATABASE livegrid CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'livegrid'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON livegrid.* TO 'livegrid'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```
```bash
cd /var/www/livegrid
php artisan migrate --force
```

#### Step 7: Redis & Queue Worker
```bash
# Copy supervisor config
cp deployment/supervisor/livegrid-queue-worker.conf /etc/supervisor/conf.d/
supervisorctl reread
supervisorctl update
supervisorctl start livegrid-queue-worker:*
```

#### Step 8: Final Steps
```bash
cd /var/www/livegrid
composer install --no-dev --optimize-autoloader
php artisan config:cache
php artisan route:cache
php artisan view:cache
mkdir -p frontend
chown -R www-data:www-data frontend
```

## Updating the Application

### Using Deploy Command (Recommended)
```bash
cd /var/www/livegrid
php artisan deploy
```

### With Options
```bash
# Skip migrations
php artisan deploy --no-migrate

# Force in production
php artisan deploy --force
```

### Manual Update
```bash
cd /var/www/livegrid
git pull origin main
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan queue:restart
```

## Service Management

### Check Services Status
```bash
systemctl status nginx
systemctl status php8.2-fpm
systemctl status mysql
systemctl status redis-server
systemctl status supervisor
```

### Queue Worker Management
```bash
# Check status
supervisorctl status livegrid-queue-worker:*

# Restart workers
supervisorctl restart livegrid-queue-worker:*

# Stop workers
supervisorctl stop livegrid-queue-worker:*

# Start workers
supervisorctl start livegrid-queue-worker:*
```

### View Logs
```bash
# Laravel logs
tail -f /var/www/livegrid/storage/logs/laravel.log

# Queue worker logs
tail -f /var/www/livegrid/storage/logs/queue-worker.log

# Nginx logs
tail -f /var/log/nginx/dev.livegrid.ru-access.log
tail -f /var/log/nginx/dev.livegrid.ru-error.log
```

## Troubleshooting

### Permission Issues
```bash
chown -R www-data:www-data /var/www/livegrid
chmod -R 755 /var/www/livegrid
chmod -R 775 /var/www/livegrid/storage
chmod -R 775 /var/www/livegrid/bootstrap/cache
```

### Clear All Caches
```bash
php artisan config:clear
php artisan route:clear
php artisan view:clear
php artisan cache:clear
```

### Test Nginx Configuration
```bash
nginx -t
systemctl reload nginx
```

### Check PHP-FPM
```bash
systemctl status php8.2-fpm
systemctl restart php8.2-fpm
```

## Security Checklist

- [x] SSL certificate installed and auto-renewing
- [x] APP_DEBUG=false in production
- [x] Proper file permissions set
- [x] Storage and bootstrap/cache directories protected in nginx
- [x] Security headers configured
- [x] Database user has limited privileges
- [x] Queue workers running under www-data user

## File Structure

```
/var/www/livegrid/
├── app/
├── bootstrap/
├── config/
├── database/
├── frontend/          # Frontend build directory
├── public/
├── resources/
├── routes/
├── storage/
└── vendor/
```

## Configuration Files

- **Nginx**: `/etc/nginx/sites-available/dev.livegrid.ru`
- **Supervisor**: `/etc/supervisor/conf.d/livegrid-queue-worker.conf`
- **Environment**: `/var/www/livegrid/.env`
- **PHP-FPM**: `/etc/php/8.2/fpm/pool.d/www.conf`
