#!/bin/bash

# Frontend build script for production
# Run after git pull

set -e

PROJECT_DIR="/var/www/livegrid"

cd $PROJECT_DIR

echo "Installing root dependencies..."
npm install --legacy-peer-deps

echo "Installing frontend dependencies..."
cd frontend
npm install --legacy-peer-deps
cd ..

echo "Building frontend..."
npm run build

# AppServiceProvider::boot() calls Vite::useManifestFilename('.vite/manifest.json')
# so Laravel already knows to look in .vite/. No manual copy needed.

echo "Clearing Laravel caches..."
php artisan config:clear
php artisan view:clear
php artisan route:clear
php artisan cache:clear

echo "Frontend build completed!"
