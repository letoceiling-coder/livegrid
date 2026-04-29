<?php

namespace App\Policies;

use App\Models\LeadRequest;
use App\Models\User;
use App\Services\Auth\AccessScope;

class LeadPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('leads.read');
    }

    public function view(User $user, LeadRequest $lead): bool
    {
        return app(AccessScope::class)->canAccessModel($user, $lead, 'leads.read');
    }

    public function update(User $user, LeadRequest $lead): bool
    {
        return app(AccessScope::class)->canAccessModel($user, $lead, 'leads.update');
    }

    public function assign(User $user, LeadRequest $lead): bool
    {
        return $user->hasPermission('leads.assign')
            && app(AccessScope::class)->canAccessModel($user, $lead, 'leads.assign');
    }

    public function export(User $user): bool
    {
        return $user->hasPermission('leads.export');
    }
}
