<?php

namespace App\Http\Controllers\Api\Crm;

use App\Http\Controllers\Controller;
use App\Models\Permission;
use App\Models\Role;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CrmRoleController extends Controller
{
    public function index(): JsonResponse
    {
        $roles = Role::query()
            ->with('permissions:id,name')
            ->orderBy('name')
            ->get()
            ->map(fn (Role $role) => $this->format($role));

        return response()->json(['data' => $roles]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:64', 'alpha_dash', 'unique:roles,name'],
            'description' => ['nullable', 'string', 'max:255'],
            'permissions' => ['array'],
            'permissions.*' => ['string', 'exists:permissions,name'],
        ]);

        $role = Role::create([
            'name' => strtoupper($validated['name']),
            'description' => $validated['description'] ?? null,
        ]);

        $this->syncPermissions($role, $validated['permissions'] ?? []);

        return response()->json(['data' => $this->format($role->load('permissions:id,name'))], 201);
    }

    public function update(Request $request, Role $role): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:64', 'alpha_dash', Rule::unique('roles', 'name')->ignore($role->id)],
            'description' => ['nullable', 'string', 'max:255'],
            'permissions' => ['sometimes', 'array'],
            'permissions.*' => ['string', 'exists:permissions,name'],
        ]);

        $role->update([
            'name' => isset($validated['name']) ? strtoupper($validated['name']) : $role->name,
            'description' => array_key_exists('description', $validated) ? $validated['description'] : $role->description,
        ]);

        if (array_key_exists('permissions', $validated)) {
            $this->syncPermissions($role, $validated['permissions']);
        }

        return response()->json(['data' => $this->format($role->load('permissions:id,name'))]);
    }

    public function permissions(): JsonResponse
    {
        return response()->json([
            'data' => Permission::query()->orderBy('name')->get(['id', 'name', 'description']),
        ]);
    }

    public function syncRolePermissions(Request $request, Role $role): JsonResponse
    {
        $validated = $request->validate([
            'permissions' => ['required', 'array'],
            'permissions.*' => ['string', 'exists:permissions,name'],
        ]);

        $this->syncPermissions($role, $validated['permissions']);

        return response()->json(['data' => $this->format($role->load('permissions:id,name'))]);
    }

    private function syncPermissions(Role $role, array $permissions): void
    {
        $ids = Permission::query()
            ->whereIn('name', $permissions)
            ->pluck('id')
            ->all();

        $role->permissions()->sync($ids);
    }

    private function format(Role $role): array
    {
        return [
            'id' => $role->id,
            'name' => $role->name,
            'description' => $role->description,
            'permissions' => $role->permissions->pluck('name')->values()->all(),
        ];
    }
}
