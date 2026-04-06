<?php

namespace App\Services\Entity\Dto;

/**
 * The result of a cursor-paginated listRecords call.
 *
 * Unlike LengthAwarePaginator there is no total count or page number —
 * these would require a COUNT(*) query that nullifies the O(1) benefit.
 *
 * Client flow:
 *   1. Request without cursor          → first page
 *   2. If has_more, use next_cursor    → second page (O(1))
 *   3. Repeat until has_more = false   → no more data
 */
final class CursorPage
{
    /**
     * @param  array<int, array<string, mixed>>  $items      Formatted records.
     * @param  int                               $perPage    Requested page size.
     * @param  bool                              $hasMore    Whether more items exist after this page.
     * @param  string|null                       $nextCursor Opaque cursor to pass for the next page.
     */
    public function __construct(
        public readonly array   $items,
        public readonly int     $perPage,
        public readonly bool    $hasMore,
        public readonly ?string $nextCursor,
    ) {}

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return [
            'data' => $this->items,
            'meta' => [
                'per_page'    => $this->perPage,
                'has_more'    => $this->hasMore,
                'next_cursor' => $this->nextCursor,
                'count'       => count($this->items),
            ],
        ];
    }
}
