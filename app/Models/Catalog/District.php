<?php

namespace App\Models\Catalog;

/**
 * Semantic alias for Region — represents the same concept (city district).
 *
 * `Region` is the legacy class bound to the `regions` table.
 * `District` extends it so all new CRM code can use the more intuitive name
 * while touching zero existing tables or data.
 *
 * Usage in new code:  District::find($id)   // same as Region::find($id)
 * Existing code:      Region::find($id)     // still works unchanged
 */
class District extends Region
{
    // Inherits: $table = 'regions', $fillable, $keyType, $incrementing
}