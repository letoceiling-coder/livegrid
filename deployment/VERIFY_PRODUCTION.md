# Production Server Verification Guide

## Server Information
- **IP:** 85.198.64.93
- **Domain:** dev.livegrid.ru
- **Project Path:** /var/www/livegrid

---

## STEP 1 — CHECK DNS

Verify DNS record points to server:

```bash
# Check DNS
dig +short dev.livegrid.ru

# Should return: 85.198.64.93
```

If DNS is incorrect, update A record:
- **Type:** A
- **Name:** dev.livegrid.ru
- **Value:** 85.198.64.93
- **TTL:** 300 (or default)

---

## STEP 2 — NGINX CONFIG

### Check if config exists:

```bash
ssh root@85.198.64.93
ls -la /etc/nginx/sites-enabled/dev.livegrid.ru
ls -la /etc/nginx/sites-available/dev.livegrid.ru
```

### Setup nginx config:

```bash
cd /var/www/livegrid

# Copy config
cp deployment/nginx/dev.livegrid.ru.conf /etc/nginx/sites-available/dev.livegrid.ru

# Create symlink
ln -s /etc/nginx/sites-available/dev.livegrid.ru /etc/nginx/sites-enabled/dev.livegrid.ru

# Test config
nginx -t

# Reload nginx
systemctl reload nginx
```

### Or use automated script:

```bash
cd /var/www/livegrid
chmod +x deployment/setup-nginx-ssl.sh
./deployment/setup-nginx-ssl.sh
```

---

## STEP 3 — INSTALL SSL

### Manual installation:

```bash
certbot --nginx -d dev.livegrid.ru
```

### Automated (via script):

The `setup-nginx-ssl.sh` script will handle SSL installation automatically.

### Verify SSL:

```bash
# Check certificate
openssl s_client -connect dev.livegrid.ru:443 -servername dev.livegrid.ru < /dev/null

# Check expiry
openssl x509 -enddate -noout -in /etc/letsencrypt/live/dev.livegrid.ru/fullchain.pem
```

---

## STEP 4 — FIX ROUTING

### Verify nginx routing:

```bash
# Check nginx config
cat /etc/nginx/sites-available/dev.livegrid.ru | grep -A 5 "location /api"
cat /etc/nginx/sites-available/dev.livegrid.ru | grep -A 5 "location /build"
cat /etc/nginx/sites-available/dev.livegrid.ru | grep -A 5 "location /"
```

**Expected routing:**
- `/api` → Laravel (index.php)
- `/build` → Static assets
- `/` → SPA fallback (/build/index.html)

### Verify Laravel routes:

```bash
cd /var/www/livegrid
php artisan route:list | grep -E "api|GET.*\{any\}"
```

**Expected:**
- API routes under `/api/*`
- SPA fallback: `GET /{any}` with regex `^(?!api).*$`

---

## STEP 5 — LARAVEL ROUTE

### Verify SPA fallback excludes API:

```bash
cd /var/www/livegrid
php artisan route:list
```

Look for:
```
GET|HEAD /{any} ................. ^(?!api).*$
```

This regex ensures:
- ✅ `/api/*` routes are NOT caught by SPA fallback
- ✅ All other routes go to SPA

---

## STEP 6 — VERIFY

### 1. HTTPS works:

```bash
# Test HTTPS
curl -I https://dev.livegrid.ru

# Should return: HTTP/2 200 or 301/302
```

### 2. Frontend loads:

```bash
# Test frontend
curl https://dev.livegrid.ru | head -20

# Should return HTML with <div id="root"></div>
```

### 3. API works:

```bash
# Test API endpoint
curl https://dev.livegrid.ru/api/v1/user

# Should return JSON (may be 401 if not authenticated, but should not be 404)
```

### 4. No route conflicts:

```bash
# Test that /api routes don't go to SPA
curl https://dev.livegrid.ru/api/v1/user

# Should NOT return HTML (SPA index.html)
# Should return JSON or 401/403
```

### 5. Build assets load:

```bash
# Test build assets (after frontend is built)
curl -I https://dev.livegrid.ru/build/assets/index-*.js

# Should return: HTTP/2 200
```

---

## Troubleshooting

### Problem: 502 Bad Gateway

**Solution:**
```bash
# Check PHP-FPM
systemctl status php8.2-fpm

# Check socket
ls -la /var/run/php/php8.2-fpm.sock

# Restart PHP-FPM
systemctl restart php8.2-fpm
```

### Problem: 404 on all routes

**Solution:**
```bash
# Check nginx config
nginx -t

# Check Laravel routes
cd /var/www/livegrid
php artisan route:clear
php artisan route:cache
php artisan route:list
```

### Problem: SSL certificate error

**Solution:**
```bash
# Renew certificate
certbot renew --nginx -d dev.livegrid.ru

# Or reinstall
certbot --nginx -d dev.livegrid.ru --force-renewal
```

### Problem: API returns HTML (SPA)

**Solution:**
- Check nginx config: `/api` location must come before `/` location
- Check Laravel route regex: `^(?!api).*$` must exclude `/api`

---

## Final Checklist

- [ ] DNS points to 85.198.64.93
- [ ] Nginx config exists and is enabled
- [ ] SSL certificate installed and valid
- [ ] HTTPS works (https://dev.livegrid.ru)
- [ ] Frontend loads (HTML returned)
- [ ] API works (JSON returned, not HTML)
- [ ] No route conflicts
- [ ] Build assets load (if frontend is built)

---

## Working URLs

After setup, these should work:

- **Frontend:** https://dev.livegrid.ru
- **API:** https://dev.livegrid.ru/api/v1/*
- **Build assets:** https://dev.livegrid.ru/build/*

---

## Quick Test Commands

```bash
# Test HTTPS
curl -I https://dev.livegrid.ru

# Test API
curl https://dev.livegrid.ru/api/v1/user

# Test frontend
curl https://dev.livegrid.ru | grep -o "<div id=\"root\">"

# Check SSL
openssl s_client -connect dev.livegrid.ru:443 -servername dev.livegrid.ru < /dev/null 2>/dev/null | grep "Verify return code"
```
