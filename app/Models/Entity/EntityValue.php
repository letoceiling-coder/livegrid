<?php

namespace App\Models\Entity;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EntityValue extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'entity_record_id',
        'entity_field_id',
        'value_string',
        'value_integer',
        'value_float',
        'value_boolean',
        'value_date',
        'value_datetime',
    ];

    protected $casts = [
        'value_integer'  => 'integer',
        'value_float'    => 'float',
        'value_boolean'  => 'boolean',
    ];

    public function record(): BelongsTo
    {
        return $this->belongsTo(EntityRecord::class, 'entity_record_id');
    }

    public function field(): BelongsTo
    {
        return $this->belongsTo(EntityField::class, 'entity_field_id');
    }

    /** Returns the typed scalar value for this row. */
    public function getValue(): mixed
    {
        if (!$this->relationLoaded('field')) {
            $this->load('field');
        }

        return match ($this->field->type) {
            'integer'    => $this->value_integer,
            'float'      => $this->value_float,
            'boolean'    => $this->value_boolean,
            'date'       => $this->value_date,
            'datetime'   => $this->value_datetime,
            default      => $this->value_string,
        };
    }
}
