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

        // Step 4: Run migrations (if not skipped)
        if (!$this->option('no-migrate')) {
            $this->info('🗄️  Running database migrations...');
            $migrateOptions = $this->option('force') ? '--force' : '';
            $migrate = Artisan::call('migrate', [
                '--force' => $this->option('force'),
            ]);
            if ($migrate !== 0) {
                $this->error('❌ Migrations failed');
                return Command::FAILURE;
            }
            $this->info('✅ Migrations completed');
        } else {
            $this->info('⏭️  Skipping migrations (--no-migrate flag)');
        }

        // Step 4: Cache configuration
        $this->info('⚙️  Caching configuration...');
        Artisan::call('config:cache');
        $this->info('✅ Configuration cached');

        // Step 5: Cache routes
        $this->info('🛣️  Caching routes...');
        Artisan::call('route:cache');
        $this->info('✅ Routes cached');

        // Step 6: Restart queue workers
        $this->info('🔄 Restarting queue workers...');
        Artisan::call('queue:restart');
        $this->info('✅ Queue workers restarted');

        // Step 7: Clear and cache views (optional but recommended)
        $this->info('👁️  Clearing view cache...');
        Artisan::call('view:clear');
        Artisan::call('view:cache');
        $this->info('✅ View cache refreshed');

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
