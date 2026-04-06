<?php

namespace App\Models\Entity;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EntityFieldOption extends Model
{
    public $timestamps = false;

    protected $fillable = ['entity_field_id', 'value', 'label', 'sort_order'];

    protected $casts = [
        'sort_order' => 'integer',
    ];

    public function field(): BelongsTo
    {
        return $this->belongsTo(EntityField::class, 'entity_field_id');
    }
}
