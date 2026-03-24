<?php

namespace App\Models\Catalog;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Building extends Model
{
    use HasFactory;

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'block_id',
        'project_id',
        'name',
        'queue',
        'deadline',
        'building_type_id',
        'floors',
        'sections',
        'source_id',
        'external_id',
    ];

    protected $casts = [
        'floors'   => 'integer',
        'sections' => 'integer',
    ];

    public function complex(): BelongsTo
    {
        return $this->belongsTo(Complex::class, 'block_id');
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function apartments(): HasMany
    {
        return $this->hasMany(Apartment::class);
    }
}