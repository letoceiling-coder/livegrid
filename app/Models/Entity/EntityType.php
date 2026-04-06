<?php

namespace App\Models\Entity;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EntityType extends Model
{
    protected $fillable = ['code', 'name', 'icon', 'is_active', 'sort_order'];

    protected $casts = [
        'is_active'  => 'boolean',
        'sort_order' => 'integer',
    ];

    public function fields(): HasMany
    {
        return $this->hasMany(EntityField::class)->orderBy('sort_order');
    }

    public function records(): HasMany
    {
        return $this->hasMany(EntityRecord::class);
    }
}
