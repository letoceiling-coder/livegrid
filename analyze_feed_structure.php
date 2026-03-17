<?php

// Deep feed structure analysis
$basePath = __DIR__ . '/storage/app/feed/raw/';

echo "=== LOADING DATA ===\n";
$apartments = json_decode(file_get_contents($basePath . 'apartments.json'), true);
$buildings = json_decode(file_get_contents($basePath . 'buildings.json'), true);
$blocks = json_decode(file_get_contents($basePath . 'blocks.json'), true);
$builders = json_decode(file_get_contents($basePath . 'builders.json'), true);
$regions = json_decode(file_get_contents($basePath . 'regions.json'), true);
$subways = json_decode(file_get_contents($basePath . 'subways.json'), true);
$finishings = json_decode(file_get_contents($basePath . 'finishings.json'), true);
$buildingtypes = json_decode(file_get_contents($basePath . 'buildingtypes.json'), true);

echo "Loaded: " . count($apartments) . " apartments, " . count($buildings) . " buildings, " . count($blocks) . " blocks\n\n";

// Build lookup maps for validation
$buildersMap = [];
foreach ($builders as $b) {
    $buildersMap[$b['_id'] ?? $b['id'] ?? ''] = true;
}

$regionsMap = [];
foreach ($regions as $r) {
    $regionsMap[$r['_id'] ?? $r['id'] ?? ''] = true;
}

$subwaysMap = [];
foreach ($subways as $s) {
    $subwaysMap[$s['_id'] ?? $s['id'] ?? ''] = true;
}

$finishingsMap = [];
foreach ($finishings as $f) {
    $finishingsMap[$f['_id'] ?? $f['id'] ?? ''] = true;
}

$buildingtypesMap = [];
foreach ($buildingtypes as $bt) {
    $buildingtypesMap[$bt['_id'] ?? $bt['id'] ?? ''] = true;
}

$blocksMap = [];
foreach ($blocks as $bl) {
    $blocksMap[$bl['_id'] ?? $bl['id'] ?? ''] = true;
}

$buildingsMap = [];
foreach ($buildings as $bd) {
    $buildingsMap[$bd['_id'] ?? $bd['id'] ?? ''] = true;
}

echo "=== STEP 1: APARTMENTS STRUCTURE ===\n\n";

// Analyze all apartments to find all possible fields
$apartmentFields = [];
$apartmentFieldTypes = [];
$apartmentFieldNulls = [];
$apartmentFieldCounts = [];

foreach ($apartments as $apt) {
    foreach ($apt as $key => $value) {
        if (!isset($apartmentFields[$key])) {
            $apartmentFields[$key] = true;
            $apartmentFieldTypes[$key] = [];
            $apartmentFieldNulls[$key] = 0;
            $apartmentFieldCounts[$key] = 0;
        }
        
        $apartmentFieldCounts[$key]++;
        
        if ($value === null) {
            $apartmentFieldNulls[$key]++;
        } else {
            $type = gettype($value);
            if ($type === 'array') {
                $type = 'array';
            } elseif ($type === 'object') {
                $type = 'object';
            }
            $apartmentFieldTypes[$key][$type] = true;
        }
    }
}

echo "Total apartments analyzed: " . count($apartments) . "\n";
echo "Total unique fields: " . count($apartmentFields) . "\n\n";

echo "APARTMENTS FIELDS:\n";
echo str_repeat("=", 80) . "\n";
printf("%-35s %-12s %-15s %-10s\n", "FIELD", "TYPE", "NULLABLE", "REQUIRED");
echo str_repeat("-", 80) . "\n";

foreach ($apartmentFields as $field => $_) {
    $nullCount = $apartmentFieldNulls[$field];
    $totalCount = $apartmentFieldCounts[$field];
    $nullPercent = $totalCount > 0 ? round(($nullCount / $totalCount) * 100, 1) : 0;
    
    $types = array_keys($apartmentFieldTypes[$field]);
    $typeStr = implode('|', $types);
    if (empty($typeStr)) {
        $typeStr = 'null';
    }
    
    $nullable = $nullCount > 0 ? "YES ($nullPercent%)" : "NO";
    $required = $nullCount == 0 && $totalCount == count($apartments) ? "YES" : "NO";
    
    printf("%-35s %-12s %-15s %-10s\n", $field, $typeStr, $nullable, $required);
}

echo "\n=== STEP 2: BUILDINGS STRUCTURE ===\n\n";

$buildingFields = [];
$buildingFieldTypes = [];
$buildingFieldNulls = [];
$buildingFieldCounts = [];

foreach ($buildings as $bld) {
    foreach ($bld as $key => $value) {
        if (!isset($buildingFields[$key])) {
            $buildingFields[$key] = true;
            $buildingFieldTypes[$key] = [];
            $buildingFieldNulls[$key] = 0;
            $buildingFieldCounts[$key] = 0;
        }
        
        $buildingFieldCounts[$key]++;
        
        if ($value === null) {
            $buildingFieldNulls[$key]++;
        } else {
            $type = gettype($value);
            if ($type === 'array') {
                $type = 'array';
            } elseif ($type === 'object') {
                $type = 'object';
            }
            $buildingFieldTypes[$key][$type] = true;
        }
    }
}

echo "Total buildings analyzed: " . count($buildings) . "\n";
echo "Total unique fields: " . count($buildingFields) . "\n\n";

echo "BUILDINGS FIELDS:\n";
echo str_repeat("=", 80) . "\n";
printf("%-35s %-12s %-15s %-10s\n", "FIELD", "TYPE", "NULLABLE", "REQUIRED");
echo str_repeat("-", 80) . "\n";

foreach ($buildingFields as $field => $_) {
    $nullCount = $buildingFieldNulls[$field];
    $totalCount = $buildingFieldCounts[$field];
    $nullPercent = $totalCount > 0 ? round(($nullCount / $totalCount) * 100, 1) : 0;
    
    $types = array_keys($buildingFieldTypes[$field]);
    $typeStr = implode('|', $types);
    if (empty($typeStr)) {
        $typeStr = 'null';
    }
    
    $nullable = $nullCount > 0 ? "YES ($nullPercent%)" : "NO";
    $required = $nullCount == 0 && $totalCount == count($buildings) ? "YES" : "NO";
    
    printf("%-35s %-12s %-15s %-10s\n", $field, $typeStr, $nullable, $required);
}

// Check relations
echo "\nBUILDINGS RELATIONS:\n";
$blockIdCount = 0;
$blockIdValid = 0;
$buildingTypeCount = 0;
$buildingTypeValid = 0;

foreach ($buildings as $bld) {
    $blockId = $bld['block_id'] ?? null;
    if ($blockId) {
        $blockIdCount++;
        if (isset($blocksMap[$blockId])) {
            $blockIdValid++;
        }
    }
    
    $btId = $bld['building_type'] ?? null;
    if ($btId) {
        $buildingTypeCount++;
        if (isset($buildingtypesMap[$btId])) {
            $buildingTypeValid++;
        }
    }
}

echo "block_id: $blockIdCount found, $blockIdValid valid\n";
echo "building_type: $buildingTypeCount found, $buildingTypeValid valid\n";

echo "\n=== STEP 3: BLOCKS STRUCTURE ===\n\n";

$blockFields = [];
$blockFieldTypes = [];
$blockFieldNulls = [];
$blockFieldCounts = [];

foreach ($blocks as $blk) {
    foreach ($blk as $key => $value) {
        if (!isset($blockFields[$key])) {
            $blockFields[$key] = true;
            $blockFieldTypes[$key] = [];
            $blockFieldNulls[$key] = 0;
            $blockFieldCounts[$key] = 0;
        }
        
        $blockFieldCounts[$key]++;
        
        if ($value === null) {
            $blockFieldNulls[$key]++;
        } else {
            $type = gettype($value);
            if ($type === 'array') {
                $type = 'array';
            } elseif ($type === 'object') {
                $type = 'object';
            }
            $blockFieldTypes[$key][$type] = true;
        }
    }
}

echo "Total blocks analyzed: " . count($blocks) . "\n";
echo "Total unique fields: " . count($blockFields) . "\n\n";

echo "BLOCKS FIELDS:\n";
echo str_repeat("=", 80) . "\n";
printf("%-35s %-12s %-15s %-10s\n", "FIELD", "TYPE", "NULLABLE", "REQUIRED");
echo str_repeat("-", 80) . "\n";

foreach ($blockFields as $field => $_) {
    $nullCount = $blockFieldNulls[$field];
    $totalCount = $blockFieldCounts[$field];
    $nullPercent = $totalCount > 0 ? round(($nullCount / $totalCount) * 100, 1) : 0;
    
    $types = array_keys($blockFieldTypes[$field]);
    $typeStr = implode('|', $types);
    if (empty($typeStr)) {
        $typeStr = 'null';
    }
    
    $nullable = $nullCount > 0 ? "YES ($nullPercent%)" : "NO";
    $required = $nullCount == 0 && $totalCount == count($blocks) ? "YES" : "NO";
    
    printf("%-35s %-12s %-15s %-10s\n", $field, $typeStr, $nullable, $required);
}

// Check relations
echo "\nBLOCKS RELATIONS:\n";
$districtCount = 0;
$districtValid = 0;
$subwayCount = 0;
$subwayValid = 0;

foreach ($blocks as $blk) {
    $districtId = $blk['district'] ?? null;
    if ($districtId) {
        $districtCount++;
        if (isset($regionsMap[$districtId])) {
            $districtValid++;
        }
    }
    
    $subways = $blk['subway'] ?? [];
    if (is_array($subways) && !empty($subways)) {
        foreach ($subways as $sub) {
            $subwayId = $sub['subway_id'] ?? null;
            if ($subwayId) {
                $subwayCount++;
                if (isset($subwaysMap[$subwayId])) {
                    $subwayValid++;
                }
            }
        }
    }
}

echo "district: $districtCount found, $districtValid valid\n";
echo "subway[].subway_id: $subwayCount found, $subwayValid valid\n";

echo "\n=== STEP 4: RELATION MAP ===\n\n";

echo "APARTMENT RELATIONS:\n";
$aptBuildingIdCount = 0;
$aptBuildingIdValid = 0;
$aptBlockIdCount = 0;
$aptBlockIdValid = 0;
$aptBlockBuilderCount = 0;
$aptBlockBuilderValid = 0;
$aptFinishingCount = 0;
$aptFinishingValid = 0;

foreach ($apartments as $apt) {
    $buildingId = $apt['building_id'] ?? null;
    if ($buildingId) {
        $aptBuildingIdCount++;
        if (isset($buildingsMap[$buildingId])) {
            $aptBuildingIdValid++;
        }
    }
    
    $blockId = $apt['block_id'] ?? null;
    if ($blockId) {
        $aptBlockIdCount++;
        if (isset($blocksMap[$blockId])) {
            $aptBlockIdValid++;
        }
    }
    
    $blockBuilder = $apt['block_builder'] ?? null;
    if ($blockBuilder) {
        $aptBlockBuilderCount++;
        if (isset($buildersMap[$blockBuilder])) {
            $aptBlockBuilderValid++;
        }
    }
    
    $finishing = $apt['finishing'] ?? null;
    if ($finishing) {
        $aptFinishingCount++;
        if (isset($finishingsMap[$finishing])) {
            $aptFinishingValid++;
        }
    }
}

echo "  building_id → buildings._id: $aptBuildingIdCount found, $aptBuildingIdValid valid\n";
echo "  block_id → blocks._id: $aptBlockIdCount found, $aptBlockIdValid valid\n";
echo "  block_builder → builders._id: $aptBlockBuilderCount found, $aptBlockBuilderValid valid\n";
echo "  finishing → finishings._id: $aptFinishingCount found, $aptFinishingValid valid\n";

echo "\nBUILDING RELATIONS:\n";
echo "  block_id → blocks._id: $blockIdCount found, $blockIdValid valid\n";
echo "  building_type → buildingtypes._id: $buildingTypeCount found, $buildingTypeValid valid\n";

echo "\nBLOCK RELATIONS:\n";
echo "  district → regions._id: $districtCount found, $districtValid valid\n";
echo "  subway[].subway_id → subways._id: $subwayCount found, $subwayValid valid\n";

echo "\n=== STEP 5: DATA ANOMALIES ===\n\n";

$anomalies = [];

// Check for missing critical fields
$aptsWithoutBuilding = 0;
$aptsWithoutBlock = 0;
foreach ($apartments as $apt) {
    if (empty($apt['building_id'])) {
        $aptsWithoutBuilding++;
    }
    if (empty($apt['block_id'])) {
        $aptsWithoutBlock++;
    }
}

if ($aptsWithoutBuilding > 0) {
    $anomalies[] = "Apartments without building_id: $aptsWithoutBuilding";
}

if ($aptsWithoutBlock > 0) {
    $anomalies[] = "Apartments without block_id: $aptsWithoutBlock";
}

// Check for invalid relations
$invalidAptBuildings = count($apartments) - $aptBuildingIdValid;
if ($invalidAptBuildings > 0) {
    $anomalies[] = "Apartments with invalid building_id: $invalidAptBuildings";
}

$invalidAptBlocks = $aptBlockIdCount - $aptBlockIdValid;
if ($invalidAptBlocks > 0) {
    $anomalies[] = "Apartments with invalid block_id: $invalidAptBlocks";
}

$buildingsWithoutBlock = 0;
foreach ($buildings as $bld) {
    if (empty($bld['block_id'])) {
        $buildingsWithoutBlock++;
    }
}

if ($buildingsWithoutBlock > 0) {
    $anomalies[] = "Buildings without block_id: $buildingsWithoutBlock";
}

// Check for type inconsistencies
$priceIssues = 0;
$areaIssues = 0;
foreach ($apartments as $apt) {
    if (isset($apt['price']) && !is_numeric($apt['price'])) {
        $priceIssues++;
    }
    if (isset($apt['area_total']) && !is_numeric($apt['area_total'])) {
        $areaIssues++;
    }
}

if ($priceIssues > 0) {
    $anomalies[] = "Apartments with non-numeric price: $priceIssues";
}

if ($areaIssues > 0) {
    $anomalies[] = "Apartments with non-numeric area_total: $areaIssues";
}

if (empty($anomalies)) {
    echo "No anomalies found.\n";
} else {
    foreach ($anomalies as $anomaly) {
        echo "- $anomaly\n";
    }
}

echo "\n=== STEP 6: CRITICAL FINDINGS ===\n\n";

// 1. Is external_id unique?
$externalIds = [];
$duplicateExternalIds = [];
foreach ($apartments as $apt) {
    $extId = $apt['_id'] ?? $apt['external_id'] ?? null;
    if ($extId) {
        if (isset($externalIds[$extId])) {
            $duplicateExternalIds[$extId] = true;
        }
        $externalIds[$extId] = true;
    }
}

echo "1. Is external_id (_id) unique?\n";
if (empty($duplicateExternalIds)) {
    echo "   YES - All " . count($externalIds) . " external_ids are unique\n";
} else {
    echo "   NO - Found " . count($duplicateExternalIds) . " duplicate external_ids\n";
}

// 2. Are there duplicates?
echo "\n2. Are there duplicates?\n";
if (empty($duplicateExternalIds)) {
    echo "   NO duplicates found by external_id\n";
} else {
    echo "   YES - Duplicates found: " . count($duplicateExternalIds) . "\n";
}

// 3. Can apartments exist without building?
echo "\n3. Can apartments exist without building?\n";
echo "   Found $aptsWithoutBuilding apartments without building_id\n";
if ($aptsWithoutBuilding > 0) {
    echo "   YES - Some apartments can exist without building reference\n";
} else {
    echo "   NO - All apartments have building_id\n";
}

// 4. Can building exist without block?
echo "\n4. Can building exist without block?\n";
echo "   Found $buildingsWithoutBlock buildings without block_id\n";
if ($buildingsWithoutBlock > 0) {
    echo "   YES - Some buildings can exist without block reference\n";
} else {
    echo "   NO - All buildings have block_id\n";
}

echo "\n=== FINAL VERDICT ===\n\n";

$isSafe = true;
$risks = [];

if (!empty($duplicateExternalIds)) {
    $isSafe = false;
    $risks[] = "Duplicate external_ids found";
}

if ($aptsWithoutBuilding > 0) {
    $risks[] = "Some apartments missing building_id";
}

if ($buildingsWithoutBlock > 0) {
    $risks[] = "Some buildings missing block_id";
}

if ($invalidAptBuildings > 0 || $invalidAptBlocks > 0) {
    $isSafe = false;
    $risks[] = "Invalid foreign key references";
}

if ($isSafe && empty($risks)) {
    echo "STATUS: IMPORT-SAFE\n";
    echo "All data is consistent and ready for import.\n";
} else {
    echo "STATUS: RISKY\n";
    echo "Risks identified:\n";
    foreach ($risks as $risk) {
        echo "  - $risk\n";
    }
}
