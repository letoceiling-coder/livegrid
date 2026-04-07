<?php

namespace App\Services\Catalog\Import;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Maps dynamic attributes from feed data to apartment_attributes table
 * Handles attribute registration and value mapping
 */
class AttributeMapper
{
    private array $attributeCache = [];

    /**
     * Extract dynamic attributes from raw feed data
     *
     * @param array $rawData Raw apartment data
     * @return array Map of attribute_code => value
     */
    public function extractAttributes(array $rawData): array
    {
        $attributes = [];

        // Map known dynamic fields
        $attributeFields = [
            'wc_count' => 'int',
            'height' => 'float',
            'number' => 'string', // apartment number
        ];

        foreach ($attributeFields as $field => $type) {
            if (isset($rawData[$field]) && $rawData[$field] !== null && $rawData[$field] !== '') {
                $attributes[$field] = [
                    'code' => $field,
                    'type' => $type,
                    'value' => $rawData[$field],
                ];
            }
        }

        return $attributes;
    }

    /**
     * Get or create attribute ID by code
     *
     * @param string $code Attribute code
     * @param string $type Attribute type (int, float, string, bool, json)
     * @param string $name Attribute display name
     * @return int Attribute ID
     */
    public function getAttributeId(string $code, string $type, string $name = ''): int
    {
        if (isset($this->attributeCache[$code])) {
            return $this->attributeCache[$code];
        }

        $attribute = DB::table('attributes')
            ->where('code', $code)
            ->first();

        if ($attribute) {
            $this->attributeCache[$code] = $attribute->id;
            return $attribute->id;
        }

        // Create new attribute using upsert to avoid race conditions
        try {
            $id = DB::table('attributes')->insertGetId([
                'code' => $code,
                'name' => $name ?: $code,
                'type' => $type,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } catch (\Exception $e) {
            // Handle race condition: attribute might have been created by another process
            $attribute = DB::table('attributes')
                ->where('code', $code)
                ->first();
            
            if ($attribute) {
                $id = $attribute->id;
            } else {
                // Use upsert as fallback
                DB::table('attributes')->upsert(
                    [
                        [
                            'code' => $code,
                            'name' => $name ?: $code,
                            'type' => $type,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]
                    ],
                    ['code'],
                    ['name', 'type', 'updated_at']
                );
                
                $attribute = DB::table('attributes')
                    ->where('code', $code)
                    ->first();
                $id = $attribute->id;
            }
        }

        $this->attributeCache[$code] = $id;
        return $id;
    }

    /**
     * Prepare attribute values for bulk insert
     *
     * @param string $apartmentId
     * @param array $attributes Map of attribute_code => ['code', 'type', 'value']
     * @return array Array of attribute records ready for insert
     */
    public function prepareAttributeRecords(string $apartmentId, array $attributes): array
    {
        $records = [];
        $now = now();

        foreach ($attributes as $attr) {
            $attributeId = $this->getAttributeId($attr['code'], $attr['type'], $attr['code']);

            $record = [
                'apartment_id' => $apartmentId,
                'attribute_id' => $attributeId,
                'value_int' => null,
                'value_float' => null,
                'value_string' => null,
                'value_bool' => null,
                'value_json' => null,
                'created_at' => $now,
                'updated_at' => $now,
            ];

            // Set value based on type
            switch ($attr['type']) {
                case 'int':
                    $record['value_int'] = (int) $attr['value'];
                    break;
                case 'float':
                    $record['value_float'] = (float) $attr['value'];
                    break;
                case 'string':
                    $record['value_string'] = (string) $attr['value'];
                    break;
                case 'bool':
                    $record['value_bool'] = (bool) $attr['value'];
                    break;
                case 'json':
                    $record['value_json'] = json_encode($attr['value']);
                    break;
            }

            $record['attr_key'] = $attr['code'];
            $record['attr_value'] = match ($attr['type']) {
                'int' => (string) (int) $attr['value'],
                'float' => (string) (float) $attr['value'],
                'bool' => ((bool) $attr['value']) ? '1' : '0',
                'json' => is_string($attr['value']) ? $attr['value'] : json_encode($attr['value']),
                default => (string) $attr['value'],
            };

            $records[] = $record;
        }

        return $records;
    }
}
