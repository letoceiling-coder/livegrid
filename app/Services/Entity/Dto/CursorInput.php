<?php

namespace App\Services\Entity\Dto;

/**
 * Encodes the position of the last item on the current page so the next
 * request can continue from that point without OFFSET.
 *
 * Structure stored inside the cursor:
 *   {
 *     "v": <sort_field_value | null>,   // null when sorting by id only
 *     "id": <last_record_id>
 *   }
 *
 * The cursor is base64-encoded so it is opaque to the client.
 *
 * SQL continuation patterns:
 *
 *   No sort (ORDER BY id DESC):
 *     WHERE entity_records.id < :last_id
 *
 *   Sort by field ASC, id DESC:
 *     WHERE (ev.value > :v)
 *        OR (ev.value = :v AND entity_records.id < :last_id)
 *
 *   Sort by field DESC, id DESC:
 *     WHERE (ev.value < :v)
 *        OR (ev.value = :v AND entity_records.id < :last_id)
 *
 * Using id as a tie-breaker guarantees stable pagination even when many
 * rows share the same sort value.
 */
final class CursorInput
{
    public function __construct(
        /** The sort-field value of the last item (null when no custom sort). */
        public readonly mixed $sortValue,
        /** The entity_records.id of the last item on the previous page. */
        public readonly int   $lastId,
    ) {}

    /** Decode an opaque cursor string; returns null if invalid. */
    public static function decode(string $encoded): ?self
    {
        $json = base64_decode($encoded, strict: true);
        if ($json === false) {
            return null;
        }

        $data = json_decode($json, associative: true);
        if (!is_array($data) || !isset($data['id']) || !is_int($data['id'])) {
            return null;
        }

        return new self(
            sortValue: $data['v'] ?? null,
            lastId:    $data['id'],
        );
    }

    /** Encode this cursor into an opaque string safe for URL/JSON. */
    public function encode(): string
    {
        return base64_encode((string) json_encode(['v' => $this->sortValue, 'id' => $this->lastId]));
    }
}
