<?php

namespace App\Models;

use App\Models\Catalog\Complex;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserFavorite extends Model
{
    protected $fillable = [
        'user_id',
        'block_id',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function complex(): BelongsTo
    {
        return $this->belongsTo(Complex::class, 'block_id');
    }
}
