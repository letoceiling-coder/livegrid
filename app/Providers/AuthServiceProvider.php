<?php

namespace App\Providers;

use App\Models\Catalog\Apartment;
use App\Models\Catalog\Complex;
use App\Models\LeadRequest;
use App\Models\User;
use App\Policies\LeadPolicy;
use App\Policies\PropertyPolicy;
use App\Policies\UserPolicy;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;

class AuthServiceProvider extends ServiceProvider
{
    /**
     * The model to policy mappings for the application.
     *
     * @var array<class-string, class-string>
     */
    protected $policies = [
        LeadRequest::class => LeadPolicy::class,
        Apartment::class => PropertyPolicy::class,
        Complex::class => PropertyPolicy::class,
        User::class => UserPolicy::class,
    ];

    /**
     * Register any authentication / authorization services.
     */
    public function boot(): void
    {
        $this->registerPolicies();

        //
    }
}
