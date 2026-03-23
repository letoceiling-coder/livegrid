<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;

class DeployCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'deploy 
                            {--force : Force the operation to run when in production}
                            {--no-migrate : Skip running migrations}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Deploy the application: pull code, install dependencies, run migrations, and cache configs';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('🚀 Starting deployment...');

        // Step 1: Git pull
        $this->info('📥 Pulling latest code from repository...');
        $gitPull = $this->executeCommand('git pull origin main', 'Failed to pull from git');
        if ($gitPull !== 0) {
            $this->warn('⚠️  Git pull failed, trying master branch...');
            $gitPull = $this->executeCommand('git pull origin master', 'Failed to pull from git');
            if ($gitPull !== 0) {
                return Command::FAILURE;
            }
        }

        // Step 2: Composer install
        $this->info('📦 Installing composer dependencies...');
        $composerInstall = $this->executeCommand(
            'COMPOSER_ALLOW_SUPERUSER=1 composer install --optimize-autoloader',
            'Failed to install composer dependencies'
        );
        if ($composerInstall !== 0) {
            return Command::FAILURE;
        }

        // Step 3: Build frontend
        $this->info('🎨 Installing npm dependencies...');
        $npmInstall = $this->executeCommand('npm install --legacy-peer-deps', 'Failed to install npm dependencies');
        if ($npmInstall !== 0) {
            return Command::FAILURE;
        }

        $this->info('🏗️  Building frontend assets...');
        $npmBuild = $this->executeCommand('npm run build', 'Failed to build frontend');
        if ($npmBuild !== 0) {
            $this->error('❌ Frontend build failed');
            return Command::FAILURE;
        }
        $this->info('✅ Frontend built successfully');

        $php = PHP_BINARY;
        $artisan = base_path('artisan');

        // Step 4: Run migrations via CLI (avoids Artisan::call bootstrap issues)
        if (!$this->option('no-migrate')) {
            $this->info('🗄️  Running database migrations...');
            $migrate = $this->executeCommand(
                "{$php} {$artisan} migrate --force",
                'Migrations failed'
            );
            if ($migrate !== 0) {
                return Command::FAILURE;
            }
            $this->info('✅ Migrations completed');
        } else {
            $this->info('⏭️  Skipping migrations (--no-migrate flag)');
        }

        // Step 5: Clear application cache (versioned keys — no session loss)
        $this->info('🧹 Clearing application cache...');
        $this->executeCommand("{$php} {$artisan} cache:clear", 'Cache clear failed (non-critical)');
        $this->info('✅ Cache cleared');

        // Step 5b: Sync search index in background (fast, non-blocking)
        $this->info('🔍 Syncing complexes search index (background)...');
        $this->executeCommand("{$php} {$artisan} complexes:sync-search >> " . base_path('storage/logs/sync-search.log') . ' 2>&1 &', 'Search sync dispatch failed (non-critical)');
        $this->info('✅ Search sync dispatched');

        // Step 6: Ensure admin user exists
        $this->info('👤 Ensuring admin user...');
        $this->executeCommand("{$php} {$artisan} crm:create-admin", 'Admin user creation failed (non-critical)');
        $this->info('✅ Admin user checked');

        // Step 6: Cache configuration, routes, views
        $this->info('⚙️  Caching configuration...');
        $this->executeCommand("{$php} {$artisan} config:cache", 'Config cache failed');
        $this->info('✅ Configuration cached');

        $this->info('🛣️  Caching routes...');
        $this->executeCommand("{$php} {$artisan} route:cache", 'Route cache failed');
        $this->info('✅ Routes cached');

        $this->info('👁️  Refreshing view cache...');
        $this->executeCommand("{$php} {$artisan} view:clear", 'View clear failed (non-critical)');
        $this->executeCommand("{$php} {$artisan} view:cache", 'View cache failed (non-critical)');
        $this->info('✅ View cache refreshed');

        $this->info('🔄 Restarting queue workers...');
        $this->executeCommand("{$php} {$artisan} queue:restart", 'Queue restart failed (non-critical)');
        $this->info('✅ Queue workers restarted');

        // Step 7: Fix storage permissions (after caches are built)
        $this->info('🔑 Fixing storage permissions...');
        $storagePath = base_path('storage');
        $cachePath   = base_path('bootstrap/cache');
        $this->executeCommand(
            "chown -R www-data:www-data {$storagePath} {$cachePath} && chmod -R 775 {$storagePath} {$cachePath}",
            'Failed to fix permissions (non-critical)'
        );
        $this->info('✅ Permissions fixed');

        // Final: Reload PHP-FPM to clear OPcache
        $this->info('🔃 Reloading PHP-FPM (clearing OPcache)...');
        $this->executeCommand('systemctl reload php8.2-fpm', 'Failed to reload PHP-FPM (non-critical)');
        $this->info('✅ PHP-FPM reloaded');

        $this->info('✨ Deployment completed successfully!');
        return Command::SUCCESS;
    }

    /**
     * Execute a shell command and return the exit code.
     *
     * @param string $command
     * @param string $errorMessage
     * @return int
     */
    private function executeCommand(string $command, string $errorMessage): int
    {
        $exitCode = 0;
        $output = [];

        exec($command . ' 2>&1', $output, $exitCode);

        if ($exitCode !== 0) {
            $this->error($errorMessage);
            $this->error(implode("\n", $output));
            return $exitCode;
        }

        if (!empty($output)) {
            $this->line(implode("\n", $output));
        }

        return $exitCode;
    }
}
