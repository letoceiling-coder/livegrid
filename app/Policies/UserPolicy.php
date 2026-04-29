<?php

namespace App\Policies;

use App\Models\User;

class UserPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('users.read');
    }

    public function view(User $user, User $target): bool
    {
        return $user->isAdminRole() || (int) $user->id === (int) $target->id;
    }

    public function create(User $user): bool
    {
        return $user->hasPermission('users.create');
    }

    public function update(User $user, User $target): bool
    {
        if ($user->isAdminRole()) {
            return true;
        }

        return $user->hasPermission('users.update') && (int) $user->team_id === (int) $target->team_id;
    }
}
