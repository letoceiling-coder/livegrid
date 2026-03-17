<?php

namespace App\Models\Catalog;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Apartment extends Model
{
    use HasFactory;

    protected $fillable = [
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
        'last_seen_at',
    ];

    public function building()
    {
        return $this->belongsTo(Building::class);
    }

    public function finishing()
    {
        return $this->belongsTo(Finishing::class);
    }
}