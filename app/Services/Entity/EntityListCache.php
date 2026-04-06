<?php

namespace App\Services\Entity;

use App\Services\Entity\Dto\CursorInput;
use Closure;
use Illuminate\Contracts\Cache\Repository;
use Illuminate\Support\Facades\Cache;
use JsonException;

/**
 * Tags + TTL cache for EntityService list endpoints.
 *
 * Key: entity:list:{type}:{hash}
 * Tags: ['entity', {typeCode}] — flush on create/update/delete for that type.
 *
 * Requires a tag-capable store (redis, memcached). If the configured store
 * does not support tagging, remember() / flushType() degrade gracefully
 * (no cache / no-op flush).
 */
final class EntityListCache
{
    private const TTL = 60;
    private const INDEX_TTL = 300;

    private function store(): Repository
    {
        $preferred = config('cache.entity_list_store');

        try {
            return $preferred !== null && $preferred !== ''
                ? Cache::store((string) $preferred)
                : Cache::store();
        } catch (\Throwable) {
            // e.g. redis driver configured but ext-redis is missing
            return Cache::store();
        }
    }

    /**
     * @template T of array
     * @param  Closure(): T  $callback
     * @return T
     */
    public function remember(string $typeCode, string $hash, Closure $callback): array
    {
        $key = "entity:list:{$typeCode}:{$hash}";

        try {
            /** @var T */
            return $this->store()->tags(['entity', $typeCode])->remember($key, self::TTL, $callback);
        } catch (\Throwable) {
            // No tag support (file/database) or store init failed — emulate tags.
            $store = $this->store();

            /** @var T $value */
            $value = $store->remember($key, self::TTL, $callback);
            $this->indexKeyForType($store, $typeCode, $key);

            return $value;
        }
    }

    public function flushType(string $typeCode): void
    {
        try {
            $this->store()->tags(['entity', $typeCode])->flush();
        } catch (\Throwable) {
            // No tag support — emulate tag flush by forgetting indexed keys.
            $store = $this->store();
            $idxKey = $this->indexKey($typeCode);
            $keys = $store->get($idxKey, []);
            if (is_array($keys)) {
                foreach ($keys as $k => $_) {
                    if (is_string($k) && $k !== '') {
                        $store->forget($k);
                    }
                }
            }

            $store->forget($idxKey);
        }
    }

    private function indexKey(string $typeCode): string
    {
        return "entity:tag:{$typeCode}:keys";
    }

    private function indexKeyForType(Repository $store, string $typeCode, string $key): void
    {
        $idxKey = $this->indexKey($typeCode);
        $keys = $store->get($idxKey, []);
        if (!is_array($keys)) {
            $keys = [];
        }

        // Store as associative-array set to avoid duplicates.
        $keys[$key] = true;
        $store->put($idxKey, $keys, self::INDEX_TTL);
    }

    /**
     * Stable fingerprint for offset list (page mode).
     *
     * @param  array<string, mixed>  $params  Raw request query.
     */
    public static function hashOffsetList(array $params, int $perPage, int $page): string
    {
        $payload = [
            'mode'     => 'offset',
            'f'        => self::normalizedFilterParams($params),
            'page'     => $page,
            'per_page' => $perPage,
            'sort'     => isset($params['sort']) ? (string) $params['sort'] : null,
            'sort_dir' => isset($params['sort_dir'])
                ? strtolower(trim((string) $params['sort_dir']))
                : 'asc',
            'search' => isset($params['search']) && $params['search'] !== ''
                ? (string) $params['search']
                : null,
            'deleted' => isset($params['deleted']) && $params['deleted'] !== ''
                ? strtolower(trim((string) $params['deleted']))
                : null,
        ];

        return self::hashPayload($payload);
    }

    /**
     * Stable fingerprint for cursor list.
     *
     * @param  array<string, mixed>  $params  Raw request query.
     */
    public static function hashCursorList(array $params, int $perPage, ?CursorInput $cursor): string
    {
        $payload = [
            'mode'     => 'cursor',
            'f'        => self::normalizedFilterParams($params),
            'per_page' => $perPage,
            'sort'     => isset($params['sort']) ? (string) $params['sort'] : null,
            'sort_dir' => isset($params['sort_dir'])
                ? strtolower(trim((string) $params['sort_dir']))
                : 'asc',
            'search' => isset($params['search']) && $params['search'] !== ''
                ? (string) $params['search']
                : null,
            'cursor' => $cursor === null
                ? null
                : ['i' => $cursor->lastId, 's' => $cursor->sortValue],
            'deleted' => isset($params['deleted']) && $params['deleted'] !== ''
                ? strtolower(trim((string) $params['deleted']))
                : null,
        ];

        return self::hashPayload($payload);
    }

    /**
     * @param  array<string, mixed>  $params
     * @return array<string, mixed>
     */
    private static function normalizedFilterParams(array $params): array
    {
        $skip = array_flip(FilterParser::RESERVED_PARAM_KEYS);
        $out  = [];

        foreach ($params as $key => $value) {
            $k = (string) $key;
            if (isset($skip[$k])) {
                continue;
            }

            if (is_array($value)) {
                $value = array_values(array_filter($value, fn($v) => $v !== null && $v !== ''));
                sort($value, SORT_STRING);
            }

            $out[$k] = $value;
        }

        ksort($out, SORT_STRING);

        return $out;
    }

    /** @param  array<string, mixed>  $payload */
    private static function hashPayload(array $payload): string
    {
        try {
            $json = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            $json = serialize($payload);
        }

        // Spec: md5(filters+sort+cursor+limit)
        return md5($json);
    }
}
