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
                            {--no-migrate : Skip running migrations}
                            {--no-build : Skip frontend build (use when assets are already deployed)}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Deploy: pull code → composer → npm build → migrate → sync search → cache configs';

    /** Production document root (livegrid.ru). */
    private string $prodPath = '/var/www/livegrid.ru';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('🚀 Starting deployment...');

        $prodPath = $this->prodPath;

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

        // Step 2: Composer install (--no-dev for production)
        $this->info('📦 Installing composer dependencies...');
        putenv('COMPOSER_ALLOW_SUPERUSER=1');
        $composerInstall = $this->executeCommand(
            'composer install --no-dev --optimize-autoloader',
            'Failed to install composer dependencies'
        );
        if ($composerInstall !== 0) {
            return Command::FAILURE;
        }

        // Step 3: Build frontend (root vite.config.js → public/build/ with frontend/src/main.tsx entry)
        if (!$this->option('no-build')) {
            $this->info('🎨 Installing npm dependencies (root)...');
            $npmInstall = $this->executeCommand('npm install --legacy-peer-deps', 'Failed to install npm dependencies');
            if ($npmInstall !== 0) {
                return Command::FAILURE;
            }

            // Remove stale build so old hashed assets don't accumulate
            $buildPath = public_path('build');
            $this->info("🗑️  Removing old build ({$buildPath})...");
            $this->executeCommand("rm -rf {$buildPath}", 'Failed to remove old build (non-critical)');

            $this->info('🏗️  Building frontend assets (vite.config.js)...');
            $npmBuild = $this->executeCommand('npx vite build --config vite.config.js', 'Failed to build frontend');
            if ($npmBuild !== 0) {
                $this->error('❌ Frontend build failed');
                return Command::FAILURE;
            }

            if (!file_exists(public_path('build/.vite/manifest.json'))) {
                $this->error('Build failed: manifest missing');

                return Command::FAILURE;
            }

            // Verify manifest was generated correctly
            $manifest = public_path('build/.vite/manifest.json');
            $manifestData = json_decode(file_get_contents($manifest), true);
            if (!isset($manifestData['frontend/src/main.tsx'])) {
                $this->error('❌ Manifest does not contain frontend/src/main.tsx entry — check vite.config.js input');
                return Command::FAILURE;
            }
            $this->info('✅ Frontend built successfully (manifest OK)');

            $buildFileCount = $this->countFilesInDirectory($buildPath);
            $this->info('📋 Deploy build summary:');
            $this->line('   build path: '.$buildPath);
            $this->line('   prod path:  '.$prodPath);
            $this->line('   build files: '.$buildFileCount);

            if (is_dir($prodPath)) {
                $this->info('Sync build to production path...');
                $prodBuild = $prodPath.'/public/build';
                // Replace prod build entirely (includes .vite/); rm …/* alone can miss dot-dirs and fail on empty globs.
                $syncRm = $this->executeCommand(
                    'rm -rf '.escapeshellarg($prodBuild).' && mkdir -p '.escapeshellarg($prodBuild),
                    'Failed to clear production public/build'
                );
                if ($syncRm !== 0) {
                    return Command::FAILURE;
                }
                $syncCp = $this->executeCommand(
                    'cp -a '.escapeshellarg(rtrim($buildPath, '/')).'/. '.escapeshellarg(rtrim($prodBuild, '/')).'/',
                    'Failed to copy build to production path'
                );
                if ($syncCp !== 0) {
                    return Command::FAILURE;
                }

                $prodFileCount = $this->countFilesInDirectory($prodBuild);
                $this->line('   prod build files (after sync): '.$prodFileCount);

                $this->info('Sync git to production...');
                $gitProd = $this->executeCommand(
                    'cd '.escapeshellarg($prodPath).' && git fetch origin && git reset --hard origin/main',
                    'Failed to sync git on production path'
                );
                if ($gitProd !== 0) {
                    return Command::FAILURE;
                }
            }
        } else {
            $this->info('⏭️  Skipping frontend build (--no-build flag)');
        }

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

        // Step 5b: Sync search index in background (non-blocking)
        $syncLog = base_path('storage/logs/sync-search.log');
        $this->info('🔍 Syncing complexes search index (background)...');
        $this->executeCommand("{$php} {$artisan} complexes:sync-search >> {$syncLog} 2>&1 &", 'Search sync dispatch failed (non-critical)');
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

        // Step 7: Fix storage + build permissions (after caches are built)
        $this->info('🔑 Fixing storage permissions...');
        $storagePath = base_path('storage');
        $cachePath   = base_path('bootstrap/cache');
        $buildPath   = public_path('build');
        $this->executeCommand(
            "chown -R www-data:www-data {$storagePath} {$cachePath} {$buildPath} && chmod -R 775 {$storagePath} {$cachePath} && chmod -R 755 {$buildPath}",
            'Failed to fix permissions (non-critical)'
        );
        $this->info('✅ Permissions fixed');

        // Step 8: Sync build + views to /var/www/livegrid (dev.livegrid.ru)
        $devDir = '/var/www/livegrid';
        if (is_dir($devDir) && realpath(base_path()) !== realpath($devDir)) {
            $this->info("🔄 Syncing build to dev server ({$devDir})...");
            $this->executeCommand(
                "rm -rf {$devDir}/public/build && cp -r {$buildPath} {$devDir}/public/build && chmod -R 755 {$devDir}/public/build",
                'Failed to sync build to dev server (non-critical)'
            );
            $this->executeCommand(
                "cp " . base_path('resources/views/app.blade.php') . " {$devDir}/resources/views/app.blade.php",
                'Failed to sync app.blade.php to dev server (non-critical)'
            );
            $this->executeCommand(
                "cp " . base_path('app/Providers/AppServiceProvider.php') . " {$devDir}/app/Providers/AppServiceProvider.php",
                'Failed to sync AppServiceProvider.php to dev server (non-critical)'
            );
            $php = PHP_BINARY;
            $this->executeCommand(
                "cd {$devDir} && {$php} artisan optimize:clear && {$php} artisan optimize",
                'Failed to clear cache on dev server (non-critical)'
            );
            $this->info('✅ Dev server synced');
        }

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

    private function countFilesInDirectory(string $dir): int
    {
        if (!is_dir($dir)) {
            return 0;
        }

        $count = 0;
        $iterator = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($dir, \RecursiveDirectoryIterator::SKIP_DOTS)
        );
        foreach ($iterator as $file) {
            if ($file->isFile()) {
                $count++;
            }
        }

        return $count;
    }
}
