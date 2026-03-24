<?php

namespace App\Providers;

use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // Vite 5 changed the manifest location from manifest.json to .vite/manifest.json.
        // laravel-vite-plugin ^0.7 was built for Vite 4, so we tell Laravel explicitly
        // where the manifest lives to avoid ViteManifestNotFoundException on web routes.
        Vite::useManifestFilename('.vite/manifest.json');
    }
}
