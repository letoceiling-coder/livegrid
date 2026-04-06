<?php

namespace App\Models\Entity;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EntityRelation extends Model
{
    public const UPDATED_AT = null; // Only created_at

    protected $fillable = ['entity_record_id', 'related_record_id', 'relation_type'];

    public function record(): BelongsTo
    {
        return $this->belongsTo(EntityRecord::class, 'entity_record_id');
    }

    public function relatedRecord(): BelongsTo
    {
        return $this->belongsTo(EntityRecord::class, 'related_record_id');
    }
}
