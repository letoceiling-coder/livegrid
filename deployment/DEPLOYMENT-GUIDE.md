# Production Deployment Guide

## Server Information
- **SSH**: root@85.198.64.93
- **Domain**: dev.livegrid.ru
- **Project Path**: /var/www/livegrid

## Quick Start

### 1. Connect to Server

```bash
ssh root@85.198.64.93
```

### 2. Run Deployment Script

```bash
cd /tmp
# Upload deploy-production.sh first
chmod +x deploy-production.sh
./deploy-production.sh
```

### 3. Manual Configuration

During deployment, you'll need to:

1. **Configure Database in .env**:
   ```bash
   nano /var/www/livegrid/.env
   ```
   
   Set:
   ```
   DB_CONNECTION=mysql
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_DATABASE=livegrid
   DB_USERNAME=livegrid
   DB_PASSWORD=your_secure_password
   ```

2. **Configure Redis in .env**:
   ```
   REDIS_HOST=127.0.0.1
   REDIS_PASSWORD=null
   REDIS_PORT=6379
   ```

### 4. Verify Deployment

```bash
cd /var/www/livegrid
chmod +x deployment/verify-deployment.sh
./deployment/verify-deployment.sh
```

### 5. Test Import System

```bash
cd /var/www/livegrid
chmod +x deployment/test-import.sh
./deployment/test-import.sh
```

## Step-by-Step Manual Deployment

### STEP 1: Connect & Prepare

```bash
ssh root@85.198.64.93
cd /var/www/livegrid

# If project doesn't exist:
git clone https://github.com/letoceiling-coder/livegrid.git /var/www/livegrid
cd /var/www/livegrid
composer install --no-dev --optimize-autoloader
```

### STEP 2: Environment Configuration

```bash
cp .env.example .env
nano .env
```

Required settings:
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
REDIS_PORT=6379
```

Generate key:
```bash
php artisan key:generate
```

### STEP 3: Database Setup

```bash
mysql -u root -p
```

```sql
CREATE DATABASE livegrid CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'livegrid'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON livegrid.* TO 'livegrid'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

Run migrations:
```bash
php artisan migrate --force
php artisan migrate:status
```

### STEP 4: Permissions

```bash
chown -R www-data:www-data /var/www/livegrid
chmod -R 755 /var/www/livegrid
chmod -R 775 /var/www/livegrid/storage
chmod -R 775 /var/www/livegrid/bootstrap/cache
```

### STEP 5: Nginx

```bash
# Copy config
cp /var/www/livegrid/deployment/nginx/dev.livegrid.ru.conf /etc/nginx/sites-available/dev.livegrid.ru
ln -s /etc/nginx/sites-available/dev.livegrid.ru /etc/nginx/sites-enabled/

# Test and reload
nginx -t
systemctl reload nginx
```

### STEP 6: SSL

```bash
certbot --nginx -d dev.livegrid.ru --non-interactive --agree-tos --email admin@dev.livegrid.ru
```

### STEP 7: Redis & Queue

```bash
# Check Redis
redis-cli ping

# Configure Supervisor
cp /var/www/livegrid/deployment/supervisor/livegrid-queue-worker.conf /etc/supervisor/conf.d/
supervisorctl reread
supervisorctl update
supervisorctl start livegrid-queue-worker:*
```

### STEP 8: Deploy Command

```bash
cd /var/www/livegrid
php artisan deploy --force
```

### STEP 9: Test Import

```bash
cd /var/www/livegrid
php artisan tinker
```

```php
$importer = app(\App\Services\Catalog\Import\FeedImporter::class);
$result = $importer->importFromFile('/var/www/livegrid/sample-feed.json');
print_r($result);
```

### STEP 10: Verify Data

```bash
mysql -u livegrid -p livegrid < deployment/validate-database.sql
```

Or manually:
```sql
SELECT COUNT(*) FROM apartments;
SELECT COUNT(*) FROM apartments WHERE is_active = 1;
SELECT source, external_id, COUNT(*) FROM apartments GROUP BY source, external_id HAVING COUNT(*) > 1;
```

## Troubleshooting

### Database Connection Issues

```bash
# Test connection
php artisan tinker
DB::connection()->getPdo();
```

### Permission Issues

```bash
chown -R www-data:www-data /var/www/livegrid
chmod -R 775 /var/www/livegrid/storage
```

### Queue Not Working

```bash
supervisorctl status livegrid-queue-worker:*
supervisorctl restart livegrid-queue-worker:*
```

### Clear Caches

```bash
php artisan config:clear
php artisan route:clear
php artisan view:clear
php artisan cache:clear
```

## Validation Checklist

- [ ] Site accessible: https://dev.livegrid.ru
- [ ] SSL certificate valid
- [ ] Migrations applied: `php artisan migrate:status`
- [ ] Redis working: `redis-cli ping`
- [ ] Queue workers running: `supervisorctl status`
- [ ] Import system tested
- [ ] No duplicate records (source + external_id)
- [ ] All apartments have last_seen_at
- [ ] No orphan records
- [ ] Logs clean

## Files Created

- `deploy-production.sh` - Main deployment script
- `verify-deployment.sh` - Verification script
- `test-import.sh` - Import testing script
- `validate-database.sql` - Database validation queries
- `DEPLOYMENT-GUIDE.md` - This guide
