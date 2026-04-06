<?php

namespace App\Services\Entity\Dto;

/**
 * Represents a single filter condition extracted from request params.
 *
 * Operators:
 *   eq   — exact match:   WHERE col = ?
 *   gte  — range start:   WHERE col >= ?
 *   lte  — range end:     WHERE col <= ?
 *   in   — multi-select:  WHERE col IN (...)
 *   like — text search:   WHERE col LIKE '%?%'
 */
final class FilterInput
{
    public const OP_EQ   = 'eq';
    public const OP_GTE  = 'gte';
    public const OP_LTE  = 'lte';
    public const OP_IN   = 'in';
    public const OP_LIKE = 'like';

    public const VALID_OPS = [self::OP_EQ, self::OP_GTE, self::OP_LTE, self::OP_IN, self::OP_LIKE];

    /** @param scalar|array<scalar> $value */
    public function __construct(
        public readonly string $fieldCode,
        public readonly string $operator,
        public readonly mixed  $value,
    ) {}

    public function isRange(): bool
    {
        return $this->operator === self::OP_GTE || $this->operator === self::OP_LTE;
    }

    public function isMulti(): bool
    {
        return $this->operator === self::OP_IN;
    }
}
