# Quick Deployment Reference

## ⚠️ Important Note

**I cannot directly SSH into your server or execute remote commands.** 
The scripts below must be executed manually on the server.

## Files Created

1. **deploy-production.sh** - Main deployment automation script
2. **verify-deployment.sh** - Post-deployment verification
3. **test-import.sh** - Import system testing
4. **validate-database.sql** - Database validation queries
5. **DEPLOYMENT-GUIDE.md** - Complete step-by-step guide

## Quick Commands

### 1. Upload Scripts to Server

```bash
# From your local machine
scp deployment/*.sh root@85.198.64.93:/tmp/
scp deployment/*.sql root@85.198.64.93:/tmp/
```

### 2. Connect and Deploy

```bash
ssh root@85.198.64.93
cd /tmp
chmod +x deploy-production.sh verify-deployment.sh test-import.sh
./deploy-production.sh
```

### 3. Verify Deployment

```bash
cd /var/www/livegrid
/tmp/verify-deployment.sh
```

### 4. Test Import

```bash
cd /var/www/livegrid
/tmp/test-import.sh
```

## Manual Step-by-Step (If Scripts Fail)

### Step 1: Connect
```bash
ssh root@85.198.64.93
```

### Step 2: Clone/Update Project
```bash
cd /var/www
if [ ! -d "livegrid" ]; then
    git clone https://github.com/letoceiling-coder/livegrid.git
fi
cd livegrid
git pull
composer install --no-dev --optimize-autoloader
```

### Step 3: Configure .env
```bash
nano .env
# Set: APP_ENV=production, APP_DEBUG=false, APP_URL, DB_*, CACHE_DRIVER=redis, QUEUE_CONNECTION=redis
php artisan key:generate
```

### Step 4: Database
```bash
mysql -u root -p
# CREATE DATABASE livegrid;
# CREATE USER 'livegrid'@'localhost' IDENTIFIED BY 'password';
# GRANT ALL PRIVILEGES ON livegrid.* TO 'livegrid'@'localhost';
# FLUSH PRIVILEGES;
exit

php artisan migrate --force
```

### Step 5: Permissions
```bash
chown -R www-data:www-data /var/www/livegrid
chmod -R 775 /var/www/livegrid/storage
chmod -R 775 /var/www/livegrid/bootstrap/cache
```

### Step 6: Nginx & SSL
```bash
cp /var/www/livegrid/deployment/nginx/dev.livegrid.ru.conf /etc/nginx/sites-available/
ln -s /etc/nginx/sites-available/dev.livegrid.ru.conf /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
certbot --nginx -d dev.livegrid.ru
```

### Step 7: Redis & Queue
```bash
redis-cli ping
cp /var/www/livegrid/deployment/supervisor/livegrid-queue-worker.conf /etc/supervisor/conf.d/
supervisorctl reread && supervisorctl update && supervisorctl start livegrid-queue-worker:*
```

### Step 8: Deploy
```bash
cd /var/www/livegrid
php artisan deploy --force
```

### Step 9: Test Import
```bash
cd /var/www/livegrid
php artisan tinker
```

In tinker:
```php
$importer = app(\App\Services\Catalog\Import\FeedImporter::class);
$result = $importer->importFromFile('/var/www/livegrid/sample-feed.json');
print_r($result);
```

### Step 10: Verify
```bash
mysql -u livegrid -p livegrid < /tmp/validate-database.sql
```

## Expected Results

### Import Result
```php
[
    'processed' => 2,
    'created' => 2,
    'updated' => 0,
    'archived' => 0
]
```

### Database Verification
- Total apartments: 2+
- Active apartments: 2+
- Duplicate records: 0
- Records with last_seen_at: 2+
- Orphan apartments: 0
- Orphan buildings: 0

## Troubleshooting

### If import fails:
1. Check logs: `tail -f /var/www/livegrid/storage/logs/laravel.log`
2. Verify building_id exists: `SELECT id FROM buildings LIMIT 1;`
3. Check permissions: `ls -la /var/www/livegrid/storage`

### If database errors:
1. Verify connection: `php artisan tinker` → `DB::connection()->getPdo();`
2. Check migrations: `php artisan migrate:status`
3. Verify .env DB settings

### If queue not working:
```bash
supervisorctl status livegrid-queue-worker:*
supervisorctl restart livegrid-queue-worker:*
tail -f /var/www/livegrid/storage/logs/queue-worker.log
```

## Support

All scripts include error handling and will stop on errors (set -e).
Check output for specific error messages.
