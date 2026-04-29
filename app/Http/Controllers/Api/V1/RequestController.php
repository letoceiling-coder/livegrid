<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\CrmSetting;
use App\Models\LeadRequest;
use App\Models\Role;
use App\Models\User;
use App\Services\Auth\AccessScope;
use App\Services\Integrations\TelegramBotNotifier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RequestController extends Controller
{
    public function store(Request $request, TelegramBotNotifier $notifier): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'required|string|max:32',
            'kind' => 'required|string|max:120',
            'objectName' => 'nullable|string|max:255',
            'objectUrl' => 'nullable|url|max:500',
            'blockId' => 'nullable|string|max:64',
            'meta' => 'nullable|array',
        ]);

        $owner = $this->defaultLeadOwner();

        $lead = LeadRequest::query()->create([
            'name' => $validated['name'],
            'phone' => $validated['phone'],
            'kind' => $validated['kind'],
            'object_name' => $validated['objectName'] ?? null,
            'object_url' => $validated['objectUrl'] ?? null,
            'block_id' => $validated['blockId'] ?? null,
            'status' => 'new',
            'owner_id' => $owner?->id,
            'team_id' => $owner?->team_id,
            'meta' => $validated['meta'] ?? null,
        ]);

        $notifier->notifyLead([
            'requestId' => (string) $lead->id,
            'name' => $lead->name,
            'phone' => $lead->phone,
            'kind' => $lead->kind,
            'objectName' => $lead->object_name,
            'objectUrl' => $lead->object_url ?: 'https://livegrid.ru',
            'managerName' => 'менеджер',
            'createdAt' => $lead->created_at?->format('d.m.Y, H:i'),
        ]);

        return response()->json([
            'data' => [
                'id' => $lead->id,
                'status' => $lead->status,
            ],
        ], 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'required|string|in:accepted,new',
            'acceptedByName' => 'nullable|string|max:255',
        ]);

        $lead = LeadRequest::query()->findOrFail($id);

        if (!$this->canUpdateStatus($request)) {
            return response()->json(['message' => 'Нет доступа.'], 403);
        }
        if ($request->user() && ! app(AccessScope::class)->canAccessModel($request->user(), $lead, 'leads.update')) {
            return response()->json(['message' => 'Нет доступа к заявке.'], 403);
        }

        $lead->status = $validated['status'];
        if ($validated['status'] === 'accepted') {
            $lead->accepted_at = now();
            $lead->accepted_by_user_id = $request->user()?->id;
            $lead->accepted_by_name = $request->user()?->name ?? ($validated['acceptedByName'] ?? null);
            if ($request->user()) {
                $lead->owner_id = $request->user()->id;
                $lead->team_id = $request->user()->team_id;
            }
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
                'acceptedAt' => $lead->accepted_at?->toIso8601String(),
            ],
        ]);
    }

    private function canUpdateStatus(Request $request): bool
    {
        $user = $request->user();
        if ($user && $user->is_admin) {
            return true;
        }

        $token = (string) $request->header('x-internal-token', '');
        if ($token === '') {
            return false;
        }

        $saved = (string) CrmSetting::query()
            ->where('key', 'telegram.notify_token')
            ->value('value');

        return $saved !== '' && hash_equals($saved, $token);
    }

    private function defaultLeadOwner(): ?User
    {
        return User::query()
            ->whereHas('role', fn ($query) => $query->where('name', Role::ADMIN))
            ->orWhere('is_admin', true)
            ->orderBy('id')
            ->first();
    }
}
