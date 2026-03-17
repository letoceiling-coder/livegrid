#!/bin/bash

# Test Import Script
# Tests the import system with sample data

set -e

PROJECT_DIR="/var/www/livegrid"

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

echo "🧪 Testing Import System"
echo "======================="

cd $PROJECT_DIR

# Create sample feed file
SAMPLE_FEED="$PROJECT_DIR/sample-feed.json"

cat > "$SAMPLE_FEED" << 'EOF'
[
    {
        "source": "test_feed",
        "external_id": "TEST001",
        "price": 5000000,
        "rooms_count": 2,
        "floor": 5,
        "floors": 10,
        "area_total": 45.5,
        "area_kitchen": 10.0,
        "area_rooms_total": 35.5,
        "area_balconies": 5.0,
        "building_id": 1,
        "finishing_id": null
    },
    {
        "source": "test_feed",
        "external_id": "TEST002",
        "price": 7500000,
        "rooms_count": 3,
        "floor": 8,
        "floors": 12,
        "area_total": 65.0,
        "area_kitchen": 12.5,
        "area_rooms_total": 52.5,
        "area_balconies": 8.0,
        "building_id": 1,
        "finishing_id": 1
    }
]
EOF

print_status "Sample feed created: $SAMPLE_FEED"

echo ""
echo "Running import..."
echo "----------------"

php artisan tinker << 'PHPCODE'
$importer = app(\App\Services\Catalog\Import\FeedImporter::class);
$result = $importer->importFromFile('/var/www/livegrid/sample-feed.json');
echo "Import Result:\n";
print_r($result);
PHPCODE

echo ""
echo "Verifying data..."
echo "----------------"

php artisan tinker << 'PHPCODE'
// Count total apartments
$total = \App\Models\Catalog\Apartment::count();
echo "Total apartments: $total\n";

// Count active apartments
$active = \App\Models\Catalog\Apartment::where('is_active', true)->count();
echo "Active apartments: $active\n";

// Check for duplicates
$duplicates = \App\Models\Catalog\Apartment::select('source', 'external_id')
    ->groupBy('source', 'external_id')
    ->havingRaw('COUNT(*) > 1')
    ->count();
echo "Duplicate records: $duplicates\n";

// Check last_seen_at
$withLastSeen = \App\Models\Catalog\Apartment::whereNotNull('last_seen_at')->count();
echo "Records with last_seen_at: $withLastSeen\n";

// Sample records
$samples = \App\Models\Catalog\Apartment::where('source', 'test_feed')
    ->limit(2)
    ->get(['source', 'external_id', 'price', 'is_active', 'last_seen_at']);
echo "\nSample records:\n";
foreach ($samples as $apt) {
    echo "  - {$apt->source}:{$apt->external_id} | Price: {$apt->price} | Active: " . ($apt->is_active ? 'Yes' : 'No') . " | Last seen: {$apt->last_seen_at}\n";
}
PHPCODE

echo ""
echo "Checking relations..."
echo "-------------------"

php artisan tinker << 'PHPCODE'
// Check apartments -> buildings
$orphanApartments = \App\Models\Catalog\Apartment::whereDoesntHave('building')->count();
echo "Orphan apartments (no building): $orphanApartments\n";

// Check buildings -> projects
$orphanBuildings = \App\Models\Catalog\Building::whereDoesntHave('project')->count();
echo "Orphan buildings (no project): $orphanBuildings\n";
PHPCODE

echo ""
echo "Checking logs..."
echo "---------------"

if [ -f "$PROJECT_DIR/storage/logs/laravel.log" ]; then
    echo "Recent log entries:"
    tail -20 "$PROJECT_DIR/storage/logs/laravel.log" | grep -i "import\|error\|exception" || echo "No import-related errors found"
fi

echo ""
echo "======================="
echo "✅ Import test completed"
