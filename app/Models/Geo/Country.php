<?php

namespace App\Models\Geo;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Country extends Model
{
    protected $table = 'countries';

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = ['id', 'name', 'name_en', 'flag', 'is_active'];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function geoRegions(): HasMany
    {
        return $this->hasMany(GeoRegion::class, 'country_id');
    }
}
