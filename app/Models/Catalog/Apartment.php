<?php

namespace App\Models\Catalog;

use App\Models\Concerns\LogsChanges;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Apartment extends Model
{
    use HasFactory, SoftDeletes, LogsChanges;

    public $incrementing = false;
    protected $keyType = 'string';

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
        'locked_fields',
    ];

    protected $casts = [
        'is_active'     => 'boolean',
        'price'         => 'integer',
        'floor'         => 'integer',
        'floors'        => 'integer',
        'rooms_count'   => 'integer',
        'area_total'    => 'float',
        'area_kitchen'  => 'float',
        'locked_fields' => 'array',
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

    /**
     * Room type lookup via crm_id (apartments.rooms_count = rooms.crm_id)
     */
    public function roomType(): BelongsTo
    {
        return $this->belongsTo(RoomType::class, 'rooms_count', 'crm_id');
    }
}