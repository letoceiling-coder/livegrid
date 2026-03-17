<?php

namespace App\Console\Commands;

use App\Services\Catalog\Feed\FeedDownloader;
use Illuminate\Console\Command;

class FeedDownloadCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'feed:download';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Download all feed endpoints and save as raw JSON files';

    /**
     * Execute the console command.
     */
    public function handle(FeedDownloader $downloader): int
    {
        $this->info('📥 Starting feed download...');
        $this->newLine();

        try {
            $stats = $downloader->downloadAll();

            $this->newLine();
            $this->info('📊 Download Summary:');
            $this->line("  ✅ Success: {$stats['success']}");
            $this->line("  ❌ Failed: {$stats['failed']}");
            $this->newLine();

            if (!empty($stats['files'])) {
                $this->info('📁 Files:');
                foreach ($stats['files'] as $file) {
                    if ($file['success']) {
                        $size = $this->formatBytes($file['size'] ?? 0);
                        $this->line("  ✅ {$file['endpoint']} - {$size}");
                    } else {
                        $error = $file['error'] ?? 'Unknown error';
                        $this->error("  ❌ {$file['endpoint']} - {$error}");
                    }
                }
            }

            if ($stats['failed'] > 0) {
                $this->newLine();
                $this->warn("⚠️  {$stats['failed']} file(s) failed to download. Check logs for details.");
                return Command::FAILURE;
            }

            $this->newLine();
            $this->info('✨ All feeds downloaded successfully!');
            return Command::SUCCESS;
        } catch (\Exception $e) {
            $this->error("❌ Download failed: {$e->getMessage()}");
            return Command::FAILURE;
        }
    }

    /**
     * Format bytes to human readable format
     *
     * @param int $bytes
     * @return string
     */
    private function formatBytes(int $bytes): string
    {
        $units = ['B', 'KB', 'MB', 'GB'];
        $bytes = max($bytes, 0);
        $pow = floor(($bytes ? log($bytes) : 0) / log(1024));
        $pow = min($pow, count($units) - 1);
        $bytes /= pow(1024, $pow);

        return round($bytes, 2) . ' ' . $units[$pow];
    }
}
