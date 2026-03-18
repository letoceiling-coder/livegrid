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

echo "Fixing manifest location..."
if [ -f "public/build/.vite/manifest.json" ]; then
    cp public/build/.vite/manifest.json public/build/manifest.json
fi

echo "Clearing Laravel caches..."
php artisan view:clear
php artisan route:clear

echo "Frontend build completed!"
