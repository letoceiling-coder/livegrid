<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class DeployCommand extends Command
{
    protected $signature = 'deploy
                            {--force : Required in production; also passed to migrate --force}
                            {--no-migrate : Skip database migrations}
                            {--no-build : Skip frontend npm ci and Vite build (manifest must already exist)}';

    protected $description = 'Production deploy on /var/www/livegrid.ru: git reset → composer → frontend npm ci/build → caches → php-fpm';

    /** Single production app root — deploy aborts if base_path() does not match (after realpath). */
    private const DEPLOY_ROOT = '/var/www/livegrid.ru';

    /** Must exist in minified main bundle (see frontend/src/main.tsx). */
    private const BUILD_VERIFY_SENTINEL = 'LIVEGRID_BUILD_VERIFY_AppLayout_stack_2026';

    public function handle(): int
    {
        $this->info('🚀 Starting production deployment...');

        if ($this->guardDeployRoot() !== 0) {
            return Command::FAILURE;
        }

        $php = PHP_BINARY;
        $artisan = base_path('artisan');
        $buildPath = public_path('build');
        $manifestPath = $buildPath.'/.vite/manifest.json';

        // 1. git fetch + reset
        $this->info('📥 Git: fetch + reset to origin/main...');
        $git = $this->executeCommand(
            'git fetch origin && git reset --hard origin/main',
            'Git fetch/reset failed (main)'
        );
        if ($git !== 0) {
            $this->warn('⚠️  Retrying with origin/master...');
            $git = $this->executeCommand(
                'git fetch origin && git reset --hard origin/master',
                'Git fetch/reset failed (master)'
            );
            if ($git !== 0) {
                return Command::FAILURE;
            }
        }

        // 2. composer install
        $this->info('📦 Composer install (no dev)...');
        putenv('COMPOSER_ALLOW_SUPERUSER=1');
        if ($this->executeCommand(
            'composer install --no-dev --optimize-autoloader',
            'Composer install failed'
        ) !== 0) {
            return Command::FAILURE;
        }

        // 3–4. Frontend: npm ci + vite build (outDir = public/build via frontend/vite.config.ts)
        if (!$this->option('no-build')) {
            $frontend = base_path('frontend');
            $this->info('Building frontend...');
            if ($this->executeCommand(
                'cd '.escapeshellarg($frontend).' && npm ci',
                'npm ci failed (frontend)'
            ) !== 0) {
                return Command::FAILURE;
            }

            if ($this->executeCommand(
                'cd '.escapeshellarg($frontend).' && npm run build',
                'npm run build failed (frontend)'
            ) !== 0) {
                return Command::FAILURE;
            }
        } else {
            $this->info('⏭️  Skipping frontend build (--no-build)');
        }

        // Build validation (mandatory result)
        if (!$this->validateBuildArtifacts($manifestPath)) {
            return Command::FAILURE;
        }

        // Migrations
        if (!$this->option('no-migrate')) {
            $this->info('🗄️  Migrations...');
            if ($this->executeCommand("{$php} {$artisan} migrate --force", 'Migrations failed') !== 0) {
                return Command::FAILURE;
            }
        } else {
            $this->info('⏭️  Skipping migrations (--no-migrate)');
        }

        // 5. Cache clear + production caches
        $this->info('🧹 Caches...');
        $this->executeCommand("{$php} {$artisan} optimize:clear", 'optimize:clear failed');
        $this->executeCommand("{$php} {$artisan} config:cache", 'config:cache failed');
        $this->executeCommand("{$php} {$artisan} route:cache", 'route:cache failed');
        $this->executeCommand("{$php} {$artisan} view:cache", 'view:cache failed');
        $this->executeCommand("{$php} {$artisan} queue:restart", 'queue:restart failed (non-critical)');

        // Permissions (production only — safe no-op message if chown missing)
        $this->info('🔑 Storage / build permissions...');
        $storagePath = base_path('storage');
        $cachePath = base_path('bootstrap/cache');
        $this->executeCommand(
            'chown -R www-data:www-data '.escapeshellarg($storagePath).' '.escapeshellarg($cachePath).' '.escapeshellarg($buildPath)
            .' && chmod -R 775 '.escapeshellarg($storagePath).' '.escapeshellarg($cachePath)
            .' && chmod -R 755 '.escapeshellarg($buildPath),
            'chown/chmod skipped or failed (non-critical)'
        );

        // 6. PHP-FPM reload
        $this->info('🔃 PHP-FPM reload...');
        if ($this->executeCommand('systemctl reload php8.2-fpm', 'PHP-FPM reload failed') !== 0) {
            return Command::FAILURE;
        }

        $this->printVerificationSummary($buildPath, $manifestPath);

        $this->info('✨ Deployment completed successfully.');

        return Command::SUCCESS;
    }

    /**
     * Abort unless the application runs from the canonical production directory.
     */
    private function guardDeployRoot(): int
    {
        $expected = self::DEPLOY_ROOT;
        $baseNorm = rtrim(str_replace('\\', '/', base_path()), '/');
        $expectedNorm = rtrim(str_replace('\\', '/', $expected), '/');

        if ($baseNorm !== $expectedNorm) {
            $this->error('Deploy aborted: base_path() must be '.$expected.' (STEP 2 guard).');
            $this->line('  Current base_path(): '.$baseNorm);

            return 1;
        }

        $actual = realpath(base_path());
        if ($actual === false) {
            $this->error('Deploy aborted: realpath(base_path()) failed.');

            return 1;
        }

        $expectedReal = realpath($expected);
        if ($expectedReal === false) {
            $this->error("Deploy aborted: production root does not exist: {$expected}");

            return 1;
        }

        if ($actual !== $expectedReal) {
            $this->error('Deploy aborted: resolved path does not match production root (symlink?).');
            $this->line("  Required: {$expectedReal}");
            $this->line("  Current:  {$actual}");

            return 1;
        }

        $this->info("✅ Deploy root OK: {$actual}");

        return 0;
    }

    private function validateBuildArtifacts(string $manifestPath): bool
    {
        if (!is_file($manifestPath)) {
            $this->error('❌ BUILD FAILED: manifest.json not found at public/build/.vite/manifest.json');

            return false;
        }

        $data = json_decode((string) file_get_contents($manifestPath), true);
        if (!is_array($data) || !isset($data['frontend/src/main.tsx'])) {
            $this->error('❌ BUILD FAILED: manifest invalid or missing frontend/src/main.tsx entry.');

            return false;
        }

        $mainBundles = glob(public_path('build/assets/main-*.js')) ?: [];
        if ($mainBundles === []) {
            $this->error('❌ BUILD FAILED: main bundle not found (public/build/assets/main-*.js)');

            return false;
        }

        sort($mainBundles);
        $mainPath = $mainBundles[0];
        $this->info('Main bundle: '.$mainPath);

        $mainContents = (string) file_get_contents($mainPath);
        if (!str_contains($mainContents, self::BUILD_VERIFY_SENTINEL)) {
            $this->error('❌ BUILD FAILED: verify sentinel missing in main bundle (expected '.self::BUILD_VERIFY_SENTINEL.')');

            return false;
        }

        $this->info('✅ Build validation: manifest OK, main-*.js OK, sentinel OK.');

        return true;
    }

    private function printVerificationSummary(string $buildPath, string $manifestPath): void
    {
        $this->newLine();
        $this->info('── Verification ──');

        $commit = [];
        exec('cd '.escapeshellarg(base_path()).' && git rev-parse HEAD 2>&1', $commit, $code);
        $this->line('Current commit: '.($code === 0 && isset($commit[0]) ? $commit[0] : '(unknown)'));

        $this->line('manifest.json: '.(is_file($manifestPath) ? 'exists' : 'MISSING'));
        if (is_file($manifestPath)) {
            $this->line('manifest.json mtime (UTC): '.gmdate('Y-m-d\TH:i:s\Z', (int) filemtime($manifestPath)));
        }

        $mains = glob(public_path('build/assets/main-*.js')) ?: [];
        sort($mains);
        if ($mains !== []) {
            $this->line('Main bundle path: '.$mains[0]);
            $this->line('Build verify grep (sentinel present): '.(str_contains((string) file_get_contents($mains[0]), self::BUILD_VERIFY_SENTINEL) ? 'yes' : 'no'));
        }

        if (!is_dir($buildPath)) {
            $this->warn('public/build: directory missing');

            return;
        }

        $files = $this->listBuildFiles($buildPath);
        $this->line('public/build files ('.count($files).' total):');
        $max = 40;
        foreach (array_slice($files, 0, $max) as $rel) {
            $this->line('  '.$rel);
        }
        if (count($files) > $max) {
            $this->line('  ... and '.(count($files) - $max).' more');
        }
    }

    /**
     * @return list<string> paths relative to $buildPath
     */
    private function listBuildFiles(string $buildPath): array
    {
        $out = [];
        $len = strlen(rtrim($buildPath, DIRECTORY_SEPARATOR)) + 1;
        $iterator = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($buildPath, \RecursiveDirectoryIterator::SKIP_DOTS)
        );
        foreach ($iterator as $file) {
            if ($file->isFile()) {
                $out[] = substr($file->getPathname(), $len);
            }
        }
        sort($out);

        return $out;
    }

    private function executeCommand(string $command, string $errorMessage): int
    {
        $exitCode = 0;
        $output = [];
        exec($command.' 2>&1', $output, $exitCode);

        if ($exitCode !== 0) {
            $this->error($errorMessage);
            if (!empty($output)) {
                $this->error(implode("\n", $output));
            }

            return $exitCode;
        }

        if (!empty($output)) {
            $this->line(implode("\n", $output));
        }

        return 0;
    }
}
