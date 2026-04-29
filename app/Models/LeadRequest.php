<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeadRequest extends Model
{
    protected $fillable = [
        'name',
        'phone',
        'kind',
        'object_name',
        'object_url',
        'block_id',
        'status',
        'owner_id',
        'team_id',
        'accepted_by_user_id',
        'accepted_by_name',
        'accepted_at',
        'meta',
    ];

    protected $casts = [
        'accepted_at' => 'datetime',
        'meta' => 'array',
        'owner_id' => 'integer',
        'team_id' => 'integer',
    ];

    public function acceptedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'accepted_by_user_id');
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }
}
