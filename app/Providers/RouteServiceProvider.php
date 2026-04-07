<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Foundation\Support\Providers\RouteServiceProvider as ServiceProvider;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;

class RouteServiceProvider extends ServiceProvider
{
    /**
     * The path to the "home" route for your application.
     *
     * Typically, users are redirected here after authentication.
     *
     * @var string
     */
    public const HOME = '/home';

    /**
     * Define your route model bindings, pattern filters, and other route configuration.
     */
    public function boot(): void
    {
        $this->configureRateLimiting();

        $this->routes(function () {
            Route::middleware('api')
                ->prefix('api')
                ->group(base_path('routes/api.php'));

            Route::middleware('web')
                ->group(base_path('routes/web.php'));
        });
    }

    /**
     * Configure the rate limiters for the application.
     */
    protected function configureRateLimiting(): void
    {
        RateLimiter::for('api', function (Request $request) {
            if ($user = $request->user()) {
                // Authenticated CRM users: 1000 req/min per user account
                // High enough for intensive CRM use, low enough to catch runaway scripts
                return Limit::perMinute(1000)->by('crm:'.$user->id);
            }

            // Public visitors: 300 req/min per IP
            return Limit::perMinute(300)->by($request->ip());
        });

        RateLimiter::for('apartments', function (Request $request) {
            return Limit::perMinute(120)->by($request->ip());
        });
    }
}
