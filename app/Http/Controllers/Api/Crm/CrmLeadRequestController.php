<?php

namespace App\Http\Controllers\Api\Crm;

use App\Http\Controllers\Controller;
use App\Models\LeadRequest;
use App\Services\Auth\AccessScope;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class CrmLeadRequestController extends Controller
{
    public function __construct(private readonly AccessScope $accessScope) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', LeadRequest::class);

        $perPage = min(max((int) $request->input('per_page', 20), 1), 100);
        $page = max((int) $request->input('page', 1), 1);
        $status = (string) $request->input('status', '');
        $search = trim((string) $request->input('search', ''));
        $sla = (string) $request->input('sla', '');
        $sort = (string) $request->input('sort', 'priority');
        $mine = $request->boolean('mine');
        $unassigned = $request->boolean('unassigned');

        $query = $this->accessScope
            ->apply(LeadRequest::query(), $request->user(), 'leads.read')
            ->with('acceptedBy:id,name');
        if ($status !== '') {
            $query->where('status', $status);
        }
        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('kind', 'like', "%{$search}%")
                    ->orWhere('object_name', 'like', "%{$search}%");
            });
        }
        if ($mine && $request->user()) {
            $query->where('status', 'accepted')
                ->where(function ($q) use ($request) {
                    $q->where('accepted_by_user_id', $request->user()->id)
                        ->orWhere('accepted_by_name', $request->user()->name);
                });
        }
        if ($unassigned) {
            $query->where('status', 'new')
                ->whereNull('accepted_by_user_id')
                ->where(function ($q) {
                    $q->whereNull('accepted_by_name')->orWhere('accepted_by_name', '');
                });
        }
        if ($sla === '30') {
            $query->where('status', 'new')->where('created_at', '<=', now()->subMinutes(30));
        } elseif ($sla === '60') {
            $query->where('status', 'new')->where('created_at', '<=', now()->subMinutes(60));
        }

        $total = (clone $query)->count();
        if ($sort === 'priority') {
            $query
                ->orderByRaw("CASE WHEN status = 'new' THEN 0 ELSE 1 END ASC")
                ->orderByRaw("CASE WHEN status = 'new' THEN created_at END ASC")
                ->orderByDesc('created_at');
        } else {
            $query->orderByDesc('created_at');
        }

        $items = $query
            ->offset(($page - 1) * $perPage)
            ->limit($perPage)
            ->get();

        return response()->json([
            'data' => $items->map(fn (LeadRequest $r) => [
                'id' => $r->id,
                'name' => $r->name,
                'phone' => $r->phone,
                'kind' => $r->kind,
                'object_name' => $r->object_name,
                'object_url' => $r->object_url,
                'block_id' => $r->block_id,
                'status' => $r->status,
                'accepted_at' => $r->accepted_at?->toIso8601String(),
                'accepted_by' => $r->acceptedBy?->name ?? $r->accepted_by_name,
                'created_at' => $r->created_at?->toIso8601String(),
            ]),
            'meta' => [
                'total' => $total,
                'page' => $page,
                'per_page' => $perPage,
                'pages' => (int) ceil(max($total, 1) / $perPage),
                'stats' => [
                    'new_total' => $this->leadScope($request, 'leads.read')->where('status', 'new')->count(),
                    'accepted_total' => $this->leadScope($request, 'leads.read')->where('status', 'accepted')->count(),
                    'new_today' => $this->leadScope($request, 'leads.read')->where('status', 'new')->whereDate('created_at', today())->count(),
                    'accepted_today' => $this->leadScope($request, 'leads.read')->where('status', 'accepted')->whereDate('accepted_at', today())->count(),
                    'sla_over_30m' => $this->leadScope($request, 'leads.read')
                        ->where('status', 'new')
                        ->where('created_at', '<=', now()->subMinutes(30))
                        ->count(),
                    'sla_over_60m' => $this->leadScope($request, 'leads.read')
                        ->where('status', 'new')
                        ->where('created_at', '<=', now()->subMinutes(60))
                        ->count(),
                ],
            ],
        ]);
    }

    public function export(Request $request): StreamedResponse
    {
        $this->authorize('export', LeadRequest::class);

        $status = (string) $request->input('status', '');
        $search = trim((string) $request->input('search', ''));
        $sla = (string) $request->input('sla', '');
        $sort = (string) $request->input('sort', 'priority');
        $mine = $request->boolean('mine');
        $unassigned = $request->boolean('unassigned');

        $query = $this->accessScope
            ->apply(LeadRequest::query(), $request->user(), 'leads.export')
            ->with('acceptedBy:id,name');
        if ($status !== '') {
            $query->where('status', $status);
        }
        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('kind', 'like', "%{$search}%")
                    ->orWhere('object_name', 'like', "%{$search}%");
            });
        }
        if ($mine && $request->user()) {
            $query->where('status', 'accepted')
                ->where(function ($q) use ($request) {
                    $q->where('accepted_by_user_id', $request->user()->id)
                        ->orWhere('accepted_by_name', $request->user()->name);
                });
        }
        if ($unassigned) {
            $query->where('status', 'new')
                ->whereNull('accepted_by_user_id')
                ->where(function ($q) {
                    $q->whereNull('accepted_by_name')->orWhere('accepted_by_name', '');
                });
        }
        if ($sla === '30') {
            $query->where('status', 'new')->where('created_at', '<=', now()->subMinutes(30));
        } elseif ($sla === '60') {
            $query->where('status', 'new')->where('created_at', '<=', now()->subMinutes(60));
        }
        if ($sort === 'priority') {
            $query
                ->orderByRaw("CASE WHEN status = 'new' THEN 0 ELSE 1 END ASC")
                ->orderByRaw("CASE WHEN status = 'new' THEN created_at END ASC")
                ->orderByDesc('created_at');
        } else {
            $query->orderByDesc('created_at');
        }

        $filename = 'lead-requests-' . now()->format('Ymd-His') . '.csv';

        return response()->streamDownload(function () use ($query) {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF");
            fputcsv($out, ['ID', 'Дата', 'Имя', 'Телефон', 'Тип', 'Объект', 'Ссылка', 'Статус', 'Кем принято', 'Дата принятия']);

            $query->chunk(500, function ($rows) use ($out) {
                /** @var \Illuminate\Support\Collection<int, LeadRequest> $rows */
                foreach ($rows as $r) {
                    fputcsv($out, [
                        $r->id,
                        optional($r->created_at)->format('d.m.Y H:i'),
                        $r->name,
                        $r->phone,
                        $r->kind,
                        $r->object_name,
                        $r->object_url,
                        $r->status,
                        $r->acceptedBy?->name ?? $r->accepted_by_name,
                        optional($r->accepted_at)->format('d.m.Y H:i'),
                    ]);
                }
            });

            fclose($out);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'required|string|in:new,accepted',
        ]);

        $lead = LeadRequest::query()->findOrFail($id);
        $this->authorize('update', $lead);
        $lead->status = $validated['status'];
        if ($validated['status'] === 'accepted') {
            $lead->accepted_at = now();
            $lead->accepted_by_user_id = $request->user()?->id;
            $lead->accepted_by_name = $request->user()?->name;
            $lead->owner_id = $request->user()?->id;
            $lead->team_id = $request->user()?->team_id;
        } else {
            $lead->accepted_at = null;
            $lead->accepted_by_user_id = null;
            $lead->accepted_by_name = null;
        }
        $lead->save();

        return response()->json([
            'data' => [
                'id' => $lead->id,
                'status' => $lead->status,
                'accepted_at' => $lead->accepted_at?->toIso8601String(),
            ],
        ]);
    }

    public function bulkAccept(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'integer|exists:lead_requests,id',
        ]);

        $ids = array_values(array_unique(array_map('intval', $validated['ids'])));
        $updated = $this->accessScope
            ->apply(LeadRequest::query(), $request->user(), 'leads.assign')
            ->whereIn('id', $ids)
            ->where('status', '!=', 'accepted')
            ->update([
                'status' => 'accepted',
                'accepted_at' => now(),
                'accepted_by_user_id' => $request->user()?->id,
                'accepted_by_name' => $request->user()?->name,
                'owner_id' => $request->user()?->id,
                'team_id' => $request->user()?->team_id,
                'updated_at' => now(),
            ]);

        return response()->json([
            'data' => [
                'updated' => $updated,
            ],
        ]);
    }

    private function leadScope(Request $request, string $permission)
    {
        return $this->accessScope->apply(LeadRequest::query(), $request->user(), $permission);
    }
}
