<?php

namespace App\Services\Auth;

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

class AccessScope
{
    public function apply(
        Builder $query,
        User $user,
        string $permission,
        string $ownerColumn = 'owner_id',
        string $teamColumn = 'team_id',
    ): Builder {
        return match ($user->scopeFor($permission)) {
            'ALL' => $query,
            'TEAM' => $query->where($teamColumn, $user->team_id),
            'SELF' => $query->where($ownerColumn, $user->id),
            default => $query->whereRaw('1 = 0'),
        };
    }

    public function canAccessModel(
        User $user,
        object $model,
        string $permission,
        string $ownerColumn = 'owner_id',
        string $teamColumn = 'team_id',
    ): bool {
        return match ($user->scopeFor($permission)) {
            'ALL' => true,
            'TEAM' => $user->team_id !== null && (int) ($model->{$teamColumn} ?? 0) === (int) $user->team_id,
            'SELF' => (int) ($model->{$ownerColumn} ?? 0) === (int) $user->id,
            default => false,
        };
    }
}
