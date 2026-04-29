<?php

namespace App\Http\Controllers\Api\V2;

use App\Http\Controllers\Controller;
use App\Models\Entity\EntityChangeLog;
use App\Models\Entity\EntityRecord;
use App\Services\Entity\Dto\CursorInput;
use App\Services\Entity\EntityService;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class EntityController extends Controller
{
    public function __construct(private readonly EntityService $service) {}

    // ─── GET /api/v2/entities/{type} ──────────────────────────────────────────

    /**
     * List records with filter/sort and two pagination modes.
     *
     * ── Cursor mode (recommended) ────────────────────────────────────────────
     * Pass ?cursor=<opaque_string> from a previous response.
     * Omit cursor (or pass cursor=) for the first page.
     *
     *   Response meta:
     *     has_more    : boolean — whether more pages exist
     *     next_cursor : string|null — pass as ?cursor= for the next page
     *     per_page    : int
     *     count       : int — items in this page
     *
     *   Performance: O(1) at any depth (keyset WHERE, no OFFSET, no COUNT).
     *
     * ── Offset mode (fallback) ───────────────────────────────────────────────
     * Pass ?page=N (integer ≥ 1).  Returns total/pages for UI pagination widgets.
     *
     *   Performance: O(N) — degrades at page 500+ with large datasets.
     *
     * ── Shared filter params ─────────────────────────────────────────────────
     *   ?{code}=value              exact match
     *   ?{code}_min=value          range >=
     *   ?{code}_max=value          range <=
     *   ?{code}[]=v1&{code}[]=v2   IN (multi-select)
     *   ?search=text               LIKE on is_searchable fields
     *   ?sort={code}               sort by field value
     *   ?sort_dir=asc|desc         sort direction (default asc)
     *   ?per_page=N                page size (default 20, max 100)
     *
     * ── Examples ─────────────────────────────────────────────────────────────
     *   First page:  ?price_min=5000000&sort=price&sort_dir=asc&per_page=20
     *   Second page: ?price_min=5000000&sort=price&sort_dir=asc&per_page=20&cursor=<next_cursor>
     */
    public function index(Request $request, string $type): JsonResponse
    {
        try {
            $perPage   = min((int) $request->input('per_page', 20), 100);
            $useCursor = $request->has('cursor'); // key present = cursor mode (value may be null/empty = first page)

            if ($useCursor) {
                // ── Cursor mode ───────────────────────────────────────────────
                // $request->input('cursor') can be null here when ?cursor= is sent,
                // because ConvertEmptyStringsToNull middleware converts '' → null.
                // We use $request->has() for detection and query() for the raw value.
                $rawCursor = $request->query('cursor');  // bypasses null-conversion
                $cursor    = ($rawCursor !== null && $rawCursor !== '')
                    ? CursorInput::decode((string) $rawCursor)
                    : null; // absent/empty = first page

                $result = $this->service->listRecordsCursor(
                    $type,
                    $request->all(),
                    $perPage,
                    $cursor,
                    $request->user(),
                );

                return response()->json($result->toArray());
            }

            // ── Offset mode ───────────────────────────────────────────────────
            $page      = max((int) $request->input('page', 1), 1);
            $paginator = $this->service->listRecords($type, $request->all(), $perPage, $page, $request->user());

            return response()->json([
                'data' => $paginator->items(),
                'meta' => [
                    'total'    => $paginator->total(),
                    'page'     => $paginator->currentPage(),
                    'per_page' => $paginator->perPage(),
                    'pages'    => $paginator->lastPage(),
                ],
            ]);
        } catch (ModelNotFoundException) {
            return $this->typeNotFound($type);
        } catch (\Exception $e) {
            if ($e->getMessage() === 'Too many filters') {
                return response()->json(['message' => $e->getMessage()], 422);
            }
            throw $e;
        }
    }

    // ─── POST /api/v2/entities/{type} ─────────────────────────────────────────

    /**
     * Create a new record.
     *
     * Body: { "field_code": value, ... }
     */
    public function store(Request $request, string $type): JsonResponse
    {
        try {
            $record = $this->service->createRecord(
                $type,
                $request->all(),
                $request->user()?->id,
                $request->user()?->team_id,
            );

            return response()->json(
                ['data' => $this->service->getRecord($record->id)],
                201,
            );
        } catch (ModelNotFoundException) {
            return $this->typeNotFound($type);
        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Ошибка валидации.',
                'errors'  => $e->errors(),
            ], 422);
        }
    }

    // ─── PUT /api/v2/entities/{id} ────────────────────────────────────────────

    /**
     * Update an existing record by its numeric ID.
     *
     * Body: { "field_code": new_value, ... }
     * Only the provided fields are updated.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        try {
            $record = EntityRecord::query()->findOrFail($id);
            abort_unless(app(\App\Services\Auth\AccessScope::class)->canAccessModel($request->user(), $record, 'entities.update'), 403);

            $this->service->updateRecord($id, $request->all(), $request->user()?->id);

            return response()->json(['data' => $this->service->getRecord($id)]);
        } catch (ModelNotFoundException) {
            return response()->json(['message' => "Запись #{$id} не найдена."], 404);
        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Ошибка валидации.',
                'errors'  => $e->errors(),
            ], 422);
        }
    }

    // ─── GET /api/v2/entities/{type}/{id} ─────────────────────────────────────

    /** Retrieve a single record by type and ID. */
    public function show(Request $request, string $type, int $id): JsonResponse
    {
        try {
            $data = $this->service->getRecord($id);
            $record = EntityRecord::query()->findOrFail($id);
            abort_unless(app(\App\Services\Auth\AccessScope::class)->canAccessModel($request->user(), $record, 'entities.read'), 403);

            // Ensure the record belongs to the requested type
            if ($data['type'] !== $type) {
                return response()->json(['message' => "Запись #{$id} не принадлежит типу «{$type}»."], 404);
            }

            return response()->json(['data' => $data]);
        } catch (ModelNotFoundException) {
            return response()->json(['message' => "Запись #{$id} не найдена."], 404);
        }
    }

    /** Retrieve audit history for a record. */
    public function history(Request $request, string $type, int $id): JsonResponse
    {
        $record = EntityRecord::withTrashed()
            ->with('entityType')
            ->find($id);

        if ($record === null || $record->entityType?->code !== $type) {
            return response()->json(['message' => "Запись #{$id} не принадлежит типу «{$type}»."], 404);
        }
        abort_unless(app(\App\Services\Auth\AccessScope::class)->canAccessModel($request->user(), $record, 'entities.read'), 403);

        $base = EntityChangeLog::query()
            ->where('entity_type_code', $type)
            ->where('entity_record_id', $id);

        $action = $request->query('action');
        if (is_string($action) && $action !== '') {
            $base->where('action', $action);
        }

        $userId = $request->query('user_id');
        if ($userId !== null && $userId !== '') {
            $base->where('user_id', (int) $userId);
        }

        $from = $request->query('from');
        $to   = $request->query('to');
        try {
            if (is_string($from) && $from !== '') {
                $base->where('created_at', '>=', Carbon::parse($from)->startOfDay());
            }
            if (is_string($to) && $to !== '') {
                $base->where('created_at', '<=', Carbon::parse($to)->endOfDay());
            }
        } catch (\Throwable) {
            // ignore bad dates
        }

        $search = $request->query('search');
        if (is_string($search) && trim($search) !== '') {
            $term = trim($search);
            $term = str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $term);
            $base->where('diff', 'like', "%{$term}%");
        }

        $mapRow = static fn (EntityChangeLog $log): array => [
            'id'         => $log->id,
            'action'     => $log->action,
            'user_id'    => $log->user_id,
            'user'       => $log->relationLoaded('user') && $log->user !== null
                ? ['id' => $log->user->id, 'name' => $log->user->name, 'email' => $log->user->email]
                : null,
            'created_at' => $log->created_at?->toISOString(),
            'diff'       => $log->diff,
        ];

        // Backward compatibility: no `cursor` key → return full list like before.
        if (! $request->has('cursor')) {
            $rows = $base
                ->with('user:id,name,email')
                ->orderByDesc('id')
                ->get()
                ->map($mapRow)
                ->values();

            return response()->json(['data' => $rows]);
        }

        $perPage = min((int) $request->query('per_page', 50), 100);
        $rawCursor = $request->query('cursor');
        $cursor = (is_string($rawCursor) && $rawCursor !== '') ? self::decodeHistoryCursor($rawCursor) : null;

        $q = (clone $base)
            ->with('user:id,name,email')
            ->orderByDesc('created_at')
            ->orderByDesc('id');

        if ($cursor !== null) {
            $t = Carbon::parse($cursor['t']);
            $i = (int) $cursor['i'];

            $q->where(function ($w) use ($t, $i) {
                $w->where('created_at', '<', $t)
                  ->orWhere(function ($w2) use ($t, $i) {
                      $w2->where('created_at', '=', $t)->where('id', '<', $i);
                  });
            });
        }

        $items = $q->limit($perPage + 1)->get();
        $hasMore = $items->count() > $perPage;
        if ($hasMore) {
            $items = $items->slice(0, $perPage);
        }

        $data = $items->map($mapRow)->values();

        $nextCursor = null;
        if ($hasMore && $items->isNotEmpty()) {
            $last = $items->last();
            $nextCursor = self::encodeHistoryCursor(
                $last->created_at?->toISOString() ?? now()->toISOString(),
                (int) $last->id,
            );
        }

        return response()->json([
            'data' => $data,
            'meta' => [
                'per_page'    => $perPage,
                'count'       => $data->count(),
                'has_more'    => $hasMore,
                'next_cursor' => $nextCursor,
            ],
        ]);
    }

    /** Export audit history for a record (csv|json). */
    public function historyExport(Request $request, string $type, int $id)
    {
        $record = EntityRecord::withTrashed()->with('entityType')->find($id);
        if ($record === null || $record->entityType?->code !== $type) {
            return response()->json(['message' => "Запись #{$id} не принадлежит типу «{$type}»."], 404);
        }
        abort_unless(app(\App\Services\Auth\AccessScope::class)->canAccessModel($request->user(), $record, 'entities.read'), 403);

        $base = EntityChangeLog::query()
            ->where('entity_type_code', $type)
            ->where('entity_record_id', $id);

        $action = $request->query('action');
        if (is_string($action) && $action !== '') {
            $base->where('action', $action);
        }
        $userId = $request->query('user_id');
        if ($userId !== null && $userId !== '') {
            $base->where('user_id', (int) $userId);
        }
        $from = $request->query('from');
        $to   = $request->query('to');
        try {
            if (is_string($from) && $from !== '') {
                $base->where('created_at', '>=', Carbon::parse($from)->startOfDay());
            }
            if (is_string($to) && $to !== '') {
                $base->where('created_at', '<=', Carbon::parse($to)->endOfDay());
            }
        } catch (\Throwable) {
        }
        $search = $request->query('search');
        if (is_string($search) && trim($search) !== '') {
            $term = trim($search);
            $term = str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $term);
            $base->where('diff', 'like', "%{$term}%");
        }

        $format = strtolower((string) $request->query('format', 'csv'));
        if ($format === 'json') {
            $rows = $base->with('user:id,name,email')->orderByDesc('created_at')->orderByDesc('id')->get()->map(fn (EntityChangeLog $log) => [
                'id' => $log->id,
                'action' => $log->action,
                'user_id' => $log->user_id,
                'user' => $log->user ? ['id' => $log->user->id, 'name' => $log->user->name, 'email' => $log->user->email] : null,
                'created_at' => $log->created_at?->toISOString(),
                'diff' => $log->diff,
            ])->values();

            return response()->json(['data' => $rows]);
        }

        $filename = "entity_history_{$type}_{$id}_" . now()->format('Ymd_His') . ".csv";
        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ];

        return response()->stream(function () use ($base) {
            $out = fopen('php://output', 'w');
            // UTF-8 BOM for Excel
            fwrite($out, "\xEF\xBB\xBF");
            fputcsv($out, ['id', 'action', 'user_id', 'user_name', 'user_email', 'created_at', 'diff_json']);

            $base->with('user:id,name,email')
                ->orderByDesc('created_at')
                ->orderByDesc('id')
                ->chunk(500, function ($chunk) use ($out) {
                    foreach ($chunk as $log) {
                        fputcsv($out, [
                            $log->id,
                            $log->action,
                            $log->user_id,
                            $log->user?->name,
                            $log->user?->email,
                            $log->created_at?->toISOString(),
                            json_encode($log->diff, JSON_UNESCAPED_UNICODE),
                        ]);
                    }
                });

            fclose($out);
        }, 200, $headers);
    }

    /** @return array{t: string, i: int} */
    private static function decodeHistoryCursor(string $cursor): array
    {
        $json = base64_decode($cursor, true);
        if ($json === false) {
            throw new \InvalidArgumentException('Bad cursor');
        }
        $arr = json_decode($json, true);
        if (! is_array($arr) || ! isset($arr['t'], $arr['i'])) {
            throw new \InvalidArgumentException('Bad cursor');
        }
        return ['t' => (string) $arr['t'], 'i' => (int) $arr['i']];
    }

    private static function encodeHistoryCursor(string $t, int $i): string
    {
        return base64_encode(json_encode(['t' => $t, 'i' => $i], JSON_UNESCAPED_UNICODE));
    }

    // ─── GET /api/v2/entity-types ─────────────────────────────────────────────

    /** List all active entity types with their fields. */
    public function types(): JsonResponse
    {
        $types = \App\Models\Entity\EntityType::with('fields.options')
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get()
            ->map(fn($t) => [
                'code'   => $t->code,
                'name'   => $t->name,
                'icon'   => $t->icon,
                'fields' => $t->fields->sortBy('sort_order')->values()->map(fn($f) => [
                    'code'          => $f->code,
                    'name'          => $f->name,
                    'group'         => $f->group,
                    'type'          => $f->type,
                    /** UI-friendly type for dynamic forms (no JSON). */
                    'ui_type'       => self::fieldUiType($f),
                    'is_required'   => $f->is_required,
                    'is_filterable' => $f->is_filterable,
                    'is_searchable' => $f->is_searchable,
                    'sort_order'    => $f->sort_order,
                    'relation_target_type' => $f->relation_target_type,
                    'relation_label_field' => $f->relation_label_field,
                    'validation_min' => $f->validation_min !== null ? (float) $f->validation_min : null,
                    'validation_max' => $f->validation_max !== null ? (float) $f->validation_max : null,
                    'validation_pattern'    => $f->validation_pattern,
                    'validation_min_length' => $f->validation_min_length,
                    'validation_max_length' => $f->validation_max_length,
                    'validation_enum'       => $f->validation_enum,
                    'options'       => $f->options->map(fn($o) => [
                        'value' => $o->value,
                        'label' => $o->label,
                    ]),
                ]),
            ]);

        return response()->json(['data' => $types]);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private function typeNotFound(string $type): JsonResponse
    {
        return response()->json(['message' => "Тип сущности «{$type}» не найден или неактивен."], 404);
    }

    public static function fieldUiType(\App\Models\Entity\EntityField $f): string
    {
        if ($f->relation_target_type) {
            return 'relation';
        }

        return match ($f->type) {
            'integer', 'float'       => 'number',
            'boolean'                => 'boolean',
            'select', 'multi_select' => 'select',
            'date', 'datetime'       => 'date',
            'text'                   => 'text',
            default                  => 'string',
        };
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        try {
            $record = EntityRecord::query()->findOrFail($id);
            abort_unless(app(\App\Services\Auth\AccessScope::class)->canAccessModel($request->user(), $record, 'entities.delete'), 403);
            $this->service->softDeleteRecord($id, $request->user()?->id);

            return response()->json(['ok' => true]);
        } catch (ModelNotFoundException) {
            return response()->json(['message' => "Запись #{$id} не найдена."], 404);
        }
    }

    public function restore(Request $request, int $id): JsonResponse
    {
        try {
            $record = EntityRecord::withTrashed()->findOrFail($id);
            abort_unless(app(\App\Services\Auth\AccessScope::class)->canAccessModel($request->user(), $record, 'entities.update'), 403);
            $this->service->restoreRecord($id, $request->user()?->id);

            return response()->json(['ok' => true]);
        } catch (ModelNotFoundException) {
            return response()->json(['message' => "Запись #{$id} не найдена."], 404);
        }
    }

    public function bulkDestroy(Request $request): JsonResponse
    {
        $data = $request->validate([
            'ids'   => ['required', 'array', 'min:1'],
            'ids.*' => ['integer', 'min:1'],
        ]);

        $allowedIds = app(\App\Services\Auth\AccessScope::class)
            ->apply(EntityRecord::query(), $request->user(), 'entities.delete')
            ->whereIn('id', $data['ids'])
            ->pluck('id')
            ->all();
        $this->service->bulkSoftDelete($allowedIds, $request->user()?->id);

        return response()->json(['ok' => true]);
    }

    public function bulkRestore(Request $request): JsonResponse
    {
        $data = $request->validate([
            'ids'   => ['required', 'array', 'min:1'],
            'ids.*' => ['integer', 'min:1'],
        ]);

        try {
            foreach ($data['ids'] as $id) {
                $record = EntityRecord::withTrashed()->findOrFail((int) $id);
                abort_unless(app(\App\Services\Auth\AccessScope::class)->canAccessModel($request->user(), $record, 'entities.update'), 403);
                $this->service->restoreRecord((int) $id, $request->user()?->id);
            }
        } catch (ModelNotFoundException) {
            return response()->json(['message' => 'Одна из записей не найдена.'], 404);
        }

        return response()->json(['ok' => true]);
    }

    public function bulkUpdate(Request $request): JsonResponse
    {
        $data = $request->validate([
            'ids'             => ['required', 'array', 'min:1'],
            'ids.*'           => ['integer', 'min:1'],
            'values'          => ['required', 'array', 'min:1'],
            'values.*'        => ['nullable'],
        ]);

        try {
            $allowedIds = app(\App\Services\Auth\AccessScope::class)
                ->apply(EntityRecord::query(), $request->user(), 'entities.update')
                ->whereIn('id', $data['ids'])
                ->pluck('id')
                ->all();
            $this->service->bulkUpdateRecords($allowedIds, $data['values'], $request->user()?->id);
        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Ошибка валидации.',
                'errors'  => $e->errors(),
            ], 422);
        } catch (ModelNotFoundException) {
            return response()->json(['message' => 'Одна из записей не найдена.'], 404);
        }

        return response()->json(['ok' => true]);
    }
}
