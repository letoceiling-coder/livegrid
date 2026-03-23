<?php

namespace App\Models\Catalog;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Complex extends Model
{
    protected $table = 'blocks';
    
    protected $fillable = [
        'id',
        'name',
        'slug',
        'description',
        'district_id',
        'builder_id',
        'lat',
        'lng',
        'address',
        'status',
        'deadline',
        'images',
        'advantages',
        'infrastructure',
    ];
    
    protected $casts = [
        'images' => 'array',
        'advantages' => 'array',
        'infrastructure' => 'array',
        'lat' => 'decimal:7',
        'lng' => 'decimal:7',
    ];
    
    // Relationships
    public function district(): BelongsTo
    {
        return $this->belongsTo(District::class, 'district_id');
    }
    
    public function builder(): BelongsTo
    {
        return $this->belongsTo(Builder::class, 'builder_id');
    }
    
    public function buildings(): HasMany
    {
        return $this->hasMany(Building::class, 'block_id');
    }
    
    public function subways(): BelongsToMany
    {
        return $this->belongsToMany(Subway::class, 'block_subway', 'block_id', 'subway_id')
            ->withPivot('distance_time', 'distance_type')
            ->withTimestamps();
    }
    
    public function apartments(): HasMany
    {
        return $this->hasMany(Apartment::class, 'block_id');
    }
}
