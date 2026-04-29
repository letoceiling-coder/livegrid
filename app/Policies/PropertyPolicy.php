<?php

namespace App\Policies;

use App\Models\User;
use App\Services\Auth\AccessScope;

class PropertyPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('properties.read');
    }

    public function view(User $user, object $property): bool
    {
        return app(AccessScope::class)->canAccessModel($user, $property, 'properties.read');
    }

    public function create(User $user): bool
    {
        return $user->hasPermission('properties.create');
    }

    public function update(User $user, object $property): bool
    {
        return app(AccessScope::class)->canAccessModel($user, $property, 'properties.update');
    }

    public function delete(User $user, object $property): bool
    {
        return app(AccessScope::class)->canAccessModel($user, $property, 'properties.delete');
    }

    public function publish(User $user, object $property): bool
    {
        return app(AccessScope::class)->canAccessModel($user, $property, 'properties.publish');
    }
}
