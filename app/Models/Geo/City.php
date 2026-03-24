<?php

namespace App\Models\Geo;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class City extends Model
{
    protected $table = 'cities';

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = ['id', 'geo_region_id', 'name', 'name_en', 'lat', 'lng', 'is_active'];

    protected $casts = [
        'lat'       => 'float',
        'lng'       => 'float',
        'is_active' => 'boolean',
    ];

    public function geoRegion(): BelongsTo
    {
        return $this->belongsTo(GeoRegion::class, 'geo_region_id');
    }

    public function districts(): HasMany
    {
        return $this->hasMany(GeoDistrict::class, 'city_id');
    }
}
