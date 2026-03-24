<?php

namespace App\Models\Geo;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * City neighborhoods / administrative districts.
 *
 * This table will be populated from the existing `regions` table
 * (which contains 181 Moscow districts) during the data migration phase.
 *
 * Migration path:
 *   INSERT INTO geo_districts (id, city_id, name)
 *   SELECT id, 'city-moscow', name FROM regions;
 *
 *   UPDATE blocks SET district_id = geo_districts.id
 *   (no data change needed since IDs are identical)
 */
class GeoDistrict extends Model
{
    protected $table = 'geo_districts';

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = ['id', 'city_id', 'name', 'name_en', 'is_active'];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function city(): BelongsTo
    {
        return $this->belongsTo(City::class, 'city_id');
    }
}
