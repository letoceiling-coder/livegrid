<?php

namespace App\Http\Controllers\Api\Crm;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class CrmAuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
        ]);

        $user = User::with(['role.permissions', 'team'])->where('email', $request->email)->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Неверные учётные данные.'],
            ]);
        }

        if (! $user->isAdminRole() && $user->permissionNames() === []) {
            return response()->json(['message' => 'Нет прав доступа к CRM.'], 403);
        }

        // Revoke previous CRM tokens for this user
        $user->tokens()->where('name', 'crm')->delete();

        $token = $user->createToken('crm')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user'  => $this->formatUser($user),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Вышли из системы.']);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->loadMissing(['role.permissions', 'team']);

        return response()->json($this->formatUser($user));
    }

    private function formatUser(User $user): array
    {
        return [
            'id'    => $user->id,
            'name'  => $user->name,
            'email' => $user->email,
            'role' => $user->roleName(),
            'role_id' => $user->role_id,
            'team_id' => $user->team_id,
            'team' => $user->team?->name,
            'permissions' => $user->permissionNames(),
        ];
    }
}
