<?php

namespace App\Models\Geo;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Russia's federal subjects: oblasts, republics, krais, federal cities.
 * Example: Москва (city_federal), Московская область (oblast), Санкт-Петербург
 */
class GeoRegion extends Model
{
    protected $table = 'geo_regions';

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = ['id', 'country_id', 'name', 'name_en', 'type', 'is_active'];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function country(): BelongsTo
    {
        return $this->belongsTo(Country::class, 'country_id');
    }

    public function cities(): HasMany
    {
        return $this->hasMany(City::class, 'geo_region_id');
    }
}
