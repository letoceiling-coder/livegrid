<?php

namespace App\Models\Catalog;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Apartment extends Model
{
    use HasFactory;

    protected $fillable = [
        'block_id',
        'building_id',
        'source',
        'external_id',
        'number',
        'floor',
        'floors',
        'price',
        'area_total',
        'area_kitchen',
        'area_rooms_total',
        'area_balconies',
        'rooms_count',
        'wc_count',
        'height',
        'finishing_id',
        'is_active',
        'status',
        'plan_image',
        'section',
        'last_seen_at',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'price'     => 'integer',
        'floor'     => 'integer',
        'floors'    => 'integer',
        'rooms_count' => 'integer',
        'area_total'  => 'float',
        'area_kitchen' => 'float',
    ];

    public function complex(): BelongsTo
    {
        return $this->belongsTo(Complex::class, 'block_id');
    }

    public function building(): BelongsTo
    {
        return $this->belongsTo(Building::class);
    }

    public function finishing(): BelongsTo
    {
        return $this->belongsTo(Finishing::class);
    }
}