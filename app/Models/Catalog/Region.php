<?php

namespace App\Models\Catalog;

use Illuminate\Database\Eloquent\Model;

/**
 * Represents a city district / neighborhood used in complex listings.
 *
 * Table: `regions` (legacy name — renamed logically to "District").
 * Contains 181 Moscow neighborhood records (Академический, Алтуфьевский, …).
 *
 * This model stays bound to `regions` table for 100% backward compatibility.
 * Future migration plan:
 *   1. Populate `geo_districts` from `regions`
 *   2. Switch $table to 'geo_districts'
 *   3. Drop old `regions` table
 *
 * @see \App\Models\Catalog\District  — semantic alias for this model
 * @see \App\Models\Geo\GeoDistrict   — new geo hierarchy target
 */
class Region extends Model
{
    protected $table = 'regions';

    public $timestamps = false;

    protected $fillable = ['id', 'name'];

    public $incrementing = false;

    protected $keyType = 'string';
}
