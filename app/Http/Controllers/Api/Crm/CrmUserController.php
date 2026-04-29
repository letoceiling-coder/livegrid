<?php

namespace App\Http\Controllers\Api\Crm;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\Team;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CrmUserController extends Controller
{
    public function index(): JsonResponse
    {
        $users = User::query()
            ->with(['role:id,name', 'team:id,name'])
            ->orderBy('name')
            ->get()
            ->map(fn (User $user) => $this->format($user));

        return response()->json([
            'data' => $users,
            'meta' => [
                'roles' => Role::query()->orderBy('name')->get(['id', 'name']),
                'teams' => Team::query()->orderBy('name')->get(['id', 'name']),
            ],
        ]);
    }

    public function updateRole(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'role_id' => ['required', 'integer', 'exists:roles,id'],
            'team_id' => ['nullable', 'integer', 'exists:teams,id'],
        ]);

        $user->update([
            'role_id' => $validated['role_id'],
            'team_id' => $validated['team_id'] ?? $user->team_id,
        ]);

        return response()->json(['data' => $this->format($user->load(['role:id,name', 'team:id,name']))]);
    }

    private function format(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role_id' => $user->role_id,
            'role' => $user->role?->name ?? ($user->is_admin ? Role::ADMIN : Role::USER),
            'team_id' => $user->team_id,
            'team' => $user->team?->name,
        ];
    }
}
