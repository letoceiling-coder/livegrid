<?php

namespace App\Services\Entity\Dto;

/** Represents a sort directive from the request. */
final class SortInput
{
    public const DIR_ASC  = 'asc';
    public const DIR_DESC = 'desc';

    public function __construct(
        public readonly string $fieldCode,
        public readonly string $direction = self::DIR_ASC,
    ) {}

    public function isDesc(): bool
    {
        return $this->direction === self::DIR_DESC;
    }

    /** Normalise direction string to a safe SQL literal. */
    public function sqlDir(): string
    {
        return $this->isDesc() ? 'desc' : 'asc';
    }
}
