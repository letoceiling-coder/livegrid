<?php

namespace App\Models\Entity;

use App\Models\Team;
use App\Models\User;
use App\Services\Entity\EntityListCache;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class EntityRecord extends Model
{
    use SoftDeletes;

    protected static function booted(): void
    {
        $flush = static function (self $record): void {
            $record->loadMissing('entityType');
            if ($record->entityType !== null) {
                app(EntityListCache::class)->flushType($record->entityType->code);
            }
        };

        static::deleted(static fn (self $record) => $flush($record));
        static::restored(static fn (self $record) => $flush($record));
    }

    protected $fillable = ['entity_type_id', 'created_by', 'owner_id', 'team_id'];

    protected $casts = [
        'entity_type_id' => 'integer',
        'created_by'     => 'integer',
        'owner_id'       => 'integer',
        'team_id'        => 'integer',
    ];

    public function entityType(): BelongsTo
    {
        return $this->belongsTo(EntityType::class);
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    public function values(): HasMany
    {
        return $this->hasMany(EntityValue::class);
    }

    public function relations(): HasMany
    {
        return $this->hasMany(EntityRelation::class);
    }

    public function relatedFrom(): HasMany
    {
        return $this->hasMany(EntityRelation::class, 'related_record_id');
    }
}
