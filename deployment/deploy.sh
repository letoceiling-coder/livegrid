#!/bin/bash

# Laravel Production Deployment Script
# Server: 85.198.64.93
# Domain: dev.livegrid.ru

set -e  # Exit on error

echo "🚀 Starting Laravel deployment for dev.livegrid.ru"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/var/www/livegrid"
DOMAIN="dev.livegrid.ru"
PHP_VERSION="8.2"

# Function to print colored output
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
echo "STEP 1: Server Preparation"
echo "--------------------------"

# Check PHP
if ! command -v php &> /dev/null; then
    print_warning "PHP not found. Installing PHP ${PHP_VERSION}..."
    apt-get update
    apt-get install -y software-properties-common
    add-apt-repository -y ppa:ondrej/php
    apt-get update
    apt-get install -y php${PHP_VERSION} php${PHP_VERSION}-fpm php${PHP_VERSION}-cli \
        php${PHP_VERSION}-mysql php${PHP_VERSION}-xml php${PHP_VERSION}-mbstring \
        php${PHP_VERSION}-curl php${PHP_VERSION}-zip php${PHP_VERSION}-gd \
        php${PHP_VERSION}-redis php${PHP_VERSION}-bcmath
    print_status "PHP ${PHP_VERSION} installed"
else
    PHP_VER=$(php -v | head -n 1 | cut -d " " -f 2 | cut -d "." -f 1,2)
    print_status "PHP ${PHP_VER} is installed"
fi

# Check Composer
if ! command -v composer &> /dev/null; then
    print_warning "Composer not found. Installing Composer..."
    curl -sS https://getcomposer.org/installer | php
    mv composer.phar /usr/local/bin/composer
    chmod +x /usr/local/bin/composer
    print_status "Composer installed"
else
    print_status "Composer is installed"
fi

# Check Nginx
if ! command -v nginx &> /dev/null; then
    print_warning "Nginx not found. Installing Nginx..."
    apt-get update
    apt-get install -y nginx
    systemctl enable nginx
    print_status "Nginx installed"
else
    print_status "Nginx is installed"
fi

# Check MySQL
if ! command -v mysql &> /dev/null; then
    print_warning "MySQL not found. Installing MySQL..."
    apt-get update
    DEBIAN_FRONTEND=noninteractive apt-get install -y mysql-server
    systemctl enable mysql
    print_status "MySQL installed"
else
    print_status "MySQL is installed"
fi

# Check Redis
if ! command -v redis-cli &> /dev/null; then
    print_warning "Redis not found. Installing Redis..."
    apt-get update
    apt-get install -y redis-server
    systemctl enable redis-server
    print_status "Redis installed"
else
    print_status "Redis is installed"
fi

# Check Supervisor
if ! command -v supervisorctl &> /dev/null; then
    print_warning "Supervisor not found. Installing Supervisor..."
    apt-get update
    apt-get install -y supervisor
    systemctl enable supervisor
    print_status "Supervisor installed"
else
    print_status "Supervisor is installed"
fi

# Check Node.js
if ! command -v node &> /dev/null; then
    print_warning "Node.js not found. Installing Node.js LTS..."
    curl -fsSL https://deb.nodesource.com/setup_lts.x | bash -
    apt-get install -y nodejs
    print_status "Node.js installed"
else
    NODE_VER=$(node -v)
    print_status "Node.js ${NODE_VER} is installed"
fi

echo ""
echo "STEP 2: Project Setup"
echo "---------------------"

# Create project directory
if [ ! -d "$PROJECT_DIR" ]; then
    mkdir -p $PROJECT_DIR
    print_status "Created directory: $PROJECT_DIR"
else
    print_status "Directory exists: $PROJECT_DIR"
fi

# Clone repository if directory is empty
if [ ! "$(ls -A $PROJECT_DIR)" ]; then
    print_warning "Directory is empty. Cloning repository..."
    cd $PROJECT_DIR
    git clone https://github.com/letoceiling-coder/livegrid.git .
    print_status "Repository cloned"
else
    print_status "Project directory is not empty (assuming already cloned)"
fi

# Set permissions
print_warning "Setting permissions..."
chown -R www-data:www-data $PROJECT_DIR
chmod -R 755 $PROJECT_DIR
chmod -R 775 $PROJECT_DIR/storage
chmod -R 775 $PROJECT_DIR/bootstrap/cache
print_status "Permissions set"

echo ""
echo "STEP 3: Environment Configuration"
echo "----------------------------------"

cd $PROJECT_DIR

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    print_warning ".env file not found. Creating from .env.example..."
    if [ -f .env.example ]; then
        cp .env.example .env
    else
        print_error ".env.example not found. Please create .env manually."
        exit 1
    fi
fi

# Update .env with production settings
print_warning "Configuring .env file..."
sed -i 's/APP_ENV=.*/APP_ENV=production/' .env
sed -i 's/APP_DEBUG=.*/APP_DEBUG=false/' .env
sed -i "s|APP_URL=.*|APP_URL=https://${DOMAIN}|" .env

# Generate app key if not set
if ! grep -q "APP_KEY=base64:" .env; then
    print_warning "Generating application key..."
    php artisan key:generate --force
    print_status "Application key generated"
fi

print_status ".env configured"
print_warning "⚠️  Please manually configure DB_*, REDIS_*, CACHE_DRIVER, and QUEUE_CONNECTION in .env"

echo ""
echo "STEP 4: Nginx Configuration"
echo "---------------------------"

NGINX_CONFIG="/etc/nginx/sites-available/${DOMAIN}"

if [ ! -f "$NGINX_CONFIG" ]; then
    print_warning "Creating Nginx configuration..."
    cat > $NGINX_CONFIG << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name dev.livegrid.ru;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name dev.livegrid.ru;

    root /var/www/livegrid/public;
    index index.php index.html;

    ssl_certificate /etc/letsencrypt/live/dev.livegrid.ru/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/dev.livegrid.ru/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    access_log /var/log/nginx/dev.livegrid.ru-access.log;
    error_log /var/log/nginx/dev.livegrid.ru-error.log;

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json application/javascript;

    client_max_body_size 20M;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
        fastcgi_hide_header X-Powered-By;
        fastcgi_read_timeout 300;
    }

    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }

    location ~ ^/(storage|bootstrap/cache) {
        deny all;
        access_log off;
        log_not_found off;
    }

    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }
}
EOF
    print_status "Nginx configuration created"
else
    print_status "Nginx configuration already exists"
fi

# Enable site
if [ ! -L "/etc/nginx/sites-enabled/${DOMAIN}" ]; then
    ln -s $NGINX_CONFIG /etc/nginx/sites-enabled/
    print_status "Nginx site enabled"
fi

# Test Nginx configuration
nginx -t && print_status "Nginx configuration is valid" || print_error "Nginx configuration has errors"

echo ""
echo "STEP 5: SSL Certificate"
echo "-----------------------"

# Check if certbot is installed
if ! command -v certbot &> /dev/null; then
    print_warning "Certbot not found. Installing Certbot..."
    apt-get update
    apt-get install -y certbot python3-certbot-nginx
    print_status "Certbot installed"
fi

# Check if SSL certificate exists
if [ ! -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
    print_warning "SSL certificate not found. Obtaining certificate..."
    certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@${DOMAIN} --redirect
    print_status "SSL certificate obtained"
else
    print_status "SSL certificate exists"
fi

# Setup auto-renewal
print_status "SSL auto-renewal is configured via certbot timer"

echo ""
echo "STEP 6: Database Setup"
echo "----------------------"

print_warning "⚠️  Please create MySQL database manually:"
echo "   mysql -u root -p"
echo "   CREATE DATABASE livegrid CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
echo "   CREATE USER 'livegrid'@'localhost' IDENTIFIED BY 'your_password';"
echo "   GRANT ALL PRIVILEGES ON livegrid.* TO 'livegrid'@'localhost';"
echo "   FLUSH PRIVILEGES;"
echo ""
read -p "Press Enter after database is created to continue..."

# Run migrations
print_warning "Running migrations..."
cd $PROJECT_DIR
php artisan migrate --force
print_status "Migrations completed"

echo ""
echo "STEP 7: Redis & Queue Configuration"
echo "------------------------------------"

# Configure Redis (usually works out of the box)
systemctl restart redis-server
print_status "Redis restarted"

# Create supervisor config for queue worker
SUPERVISOR_CONFIG="/etc/supervisor/conf.d/livegrid-queue-worker.conf"

if [ ! -f "$SUPERVISOR_CONFIG" ]; then
    print_warning "Creating Supervisor configuration..."
    cat > $SUPERVISOR_CONFIG << 'EOF'
[program:livegrid-queue-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/livegrid/artisan queue:work redis --sleep=3 --tries=3 --max-time=3600
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=www-data
numprocs=2
redirect_stderr=true
stdout_logfile=/var/www/livegrid/storage/logs/queue-worker.log
stopwaitsecs=3600
EOF
    print_status "Supervisor configuration created"
    
    # Reload supervisor
    supervisorctl reread
    supervisorctl update
    supervisorctl start livegrid-queue-worker:*
    print_status "Queue workers started"
else
    print_status "Supervisor configuration already exists"
    supervisorctl restart livegrid-queue-worker:*
    print_status "Queue workers restarted"
fi

echo ""
echo "STEP 8: Final Configuration"
echo "----------------------------"

cd $PROJECT_DIR

# Install dependencies
print_warning "Installing composer dependencies..."
composer install --no-dev --optimize-autoloader
print_status "Dependencies installed"

# Cache configuration
print_warning "Caching configuration..."
php artisan config:cache
php artisan route:cache
php artisan view:cache
print_status "Configuration cached"

# Create frontend directory
if [ ! -d "$PROJECT_DIR/frontend" ]; then
    mkdir -p $PROJECT_DIR/frontend
    chown -R www-data:www-data $PROJECT_DIR/frontend
    print_status "Frontend directory created"
fi

# Restart services
print_warning "Restarting services..."
systemctl restart php${PHP_VERSION}-fpm
systemctl restart nginx
print_status "Services restarted"

echo ""
echo "=================================================="
echo "✅ Deployment completed successfully!"
echo ""
echo "Next steps:"
echo "1. Verify site: https://${DOMAIN}"
echo "2. Check SSL: https://www.ssllabs.com/ssltest/analyze.html?d=${DOMAIN}"
echo "3. Monitor logs: tail -f /var/www/livegrid/storage/logs/laravel.log"
echo "4. Check queue: supervisorctl status livegrid-queue-worker:*"
echo ""
echo "To deploy updates, run: php artisan deploy"
echo "=================================================="
