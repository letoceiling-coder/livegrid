<?php

namespace App\Models\Entity;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EntityChangeLog extends Model
{
    public const ACTION_CREATED  = 'created';
    public const ACTION_UPDATED  = 'updated';
    public const ACTION_DELETED  = 'deleted';
    public const ACTION_RESTORED = 'restored';

    protected $fillable = [
        'entity_record_id',
        'entity_type_code',
        'action',
        'user_id',
        'diff',
    ];

    protected $casts = [
        'entity_record_id' => 'integer',
        'user_id'          => 'integer',
        'diff'             => 'array',
    ];

    public function record(): BelongsTo
    {
        return $this->belongsTo(EntityRecord::class, 'entity_record_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
