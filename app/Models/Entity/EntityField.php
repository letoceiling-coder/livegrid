<?php

namespace App\Models\Entity;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EntityField extends Model
{
    /** Types that store a value in value_string */
    public const STRING_TYPES = ['string', 'text', 'select', 'multi_select'];

    /** All valid field types */
    public const TYPES = [
        'string', 'integer', 'float', 'boolean',
        'date', 'datetime', 'text', 'select', 'multi_select',
    ];

    protected $fillable = [
        'entity_type_id', 'code', 'name', 'group', 'type',
        'is_required', 'is_filterable', 'is_searchable', 'sort_order',
        'relation_target_type', 'relation_label_field',
        'validation_min', 'validation_max',
        'validation_pattern', 'validation_min_length', 'validation_max_length',
        'validation_enum',
    ];

    protected $casts = [
        'is_required'             => 'boolean',
        'is_filterable'           => 'boolean',
        'is_searchable'           => 'boolean',
        'sort_order'              => 'integer',
        'validation_min'          => 'decimal:4',
        'validation_max'          => 'decimal:4',
        'validation_min_length'   => 'integer',
        'validation_max_length'   => 'integer',
        'validation_enum'         => 'array',
    ];

    public function entityType(): BelongsTo
    {
        return $this->belongsTo(EntityType::class);
    }

    public function options(): HasMany
    {
        return $this->hasMany(EntityFieldOption::class)->orderBy('sort_order');
    }

    public function values(): HasMany
    {
        return $this->hasMany(EntityValue::class);
    }

    /** Returns the column name in entity_values that holds this field's data. */
    public function valueColumn(): string
    {
        return match ($this->type) {
            'integer'                      => 'value_integer',
            'float'                        => 'value_float',
            'boolean'                      => 'value_boolean',
            'date'                         => 'value_date',
            'datetime'                     => 'value_datetime',
            default                        => 'value_string',
        };
    }
}
