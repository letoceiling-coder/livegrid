<?php

namespace App\Services\Catalog\Feed;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class FeedDownloader
{
    private string $baseUrl;
    private array $endpoints;
    private string $storagePath;
    private int $timeout;
    private int $connectTimeout;

    public function __construct()
    {
        $this->baseUrl = Config::get('feed.base_url');
        $this->endpoints = Config::get('feed.endpoints', []);
        $this->storagePath = Config::get('feed.storage_path', 'feed/raw');
        $this->timeout = Config::get('feed.timeout', 300);
        $this->connectTimeout = Config::get('feed.connect_timeout', 30);
    }

    /**
     * Download all feed endpoints
     *
     * @return array Statistics: ['success' => int, 'failed' => int, 'files' => array]
     */
    public function downloadAll(): array
    {
        if (empty($this->baseUrl)) {
            throw new \InvalidArgumentException('Feed base URL is not configured. Set FEED_ENDPOINT_PRIMARY or FEED_BASE_URL in .env');
        }

        $stats = [
            'success' => 0,
            'failed' => 0,
            'files' => [],
        ];

        foreach ($this->endpoints as $endpoint) {
            try {
                $result = $this->downloadEndpoint($endpoint);
                $stats['files'][] = $result;

                if ($result['success']) {
                    $stats['success']++;
                    Log::info("Feed downloaded successfully: {$endpoint}", [
                        'endpoint' => $endpoint,
                        'size' => $result['size'],
                    ]);
                } else {
                    $stats['failed']++;
                    Log::error("Feed download failed: {$endpoint}", [
                        'endpoint' => $endpoint,
                        'error' => $result['error'] ?? 'Unknown error',
                    ]);
                }
            } catch (\Exception $e) {
                $stats['failed']++;
                $stats['files'][] = [
                    'endpoint' => $endpoint,
                    'success' => false,
                    'error' => $e->getMessage(),
                ];
                Log::error("Feed download exception: {$endpoint}", [
                    'endpoint' => $endpoint,
                    'exception' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                ]);
            }
        }

        return $stats;
    }

    /**
     * Download a single endpoint
     *
     * @param string $endpoint
     * @return array
     */
    public function downloadEndpoint(string $endpoint): array
    {
        $url = rtrim($this->baseUrl, '/') . '/' . ltrim($endpoint, '/');
        $filename = basename($endpoint);
        $storagePath = $this->storagePath . '/' . $filename;

        // Ensure storage directory exists
        $fullPath = Storage::path($this->storagePath);
        if (!is_dir($fullPath)) {
            Storage::makeDirectory($this->storagePath);
        }

        $filePath = Storage::path($storagePath);

        try {
            $client = $this->buildHttpClient();

            // For apartments.json, use sink to avoid loading into memory
            if ($filename === 'apartments.json') {
                return $this->downloadLargeFile($client, $url, $filePath, $endpoint);
            }

            // For other files, use standard download
            $response = $client->get($url);

            if ($response->successful()) {
                Storage::put($storagePath, $response->body());
                $size = Storage::size($storagePath);

                try {
                    App::make(FeedRawPersister::class)->persistFromDownloadedFile($filename, $filePath);
                } catch (\Throwable $e) {
                    Log::warning('Feed raw persist failed', [
                        'file' => $filename,
                        'error' => $e->getMessage(),
                    ]);
                }

                return [
                    'endpoint' => $endpoint,
                    'success' => true,
                    'url' => $url,
                    'file' => $storagePath,
                    'size' => $size,
                ];
            }

            return [
                'endpoint' => $endpoint,
                'success' => false,
                'error' => "HTTP {$response->status()}: {$response->body()}",
                'url' => $url,
            ];
        } catch (\Exception $e) {
            return [
                'endpoint' => $endpoint,
                'success' => false,
                'error' => $e->getMessage(),
                'url' => $url,
            ];
        }
    }

    /**
     * Download large file using sink (stream to file)
     *
     * @param PendingRequest $client
     * @param string $url
     * @param string $filePath
     * @param string $endpoint
     * @return array
     */
    private function downloadLargeFile(
        PendingRequest $client,
        string $url,
        string $filePath,
        string $endpoint
    ): array {
        try {
            $response = $client->sink($filePath)->get($url);

            if ($response->successful() && file_exists($filePath)) {
                $size = filesize($filePath);

                try {
                    App::make(FeedRawPersister::class)->persistFromDownloadedFile(basename($endpoint), $filePath);
                } catch (\Throwable $e) {
                    Log::warning('Feed raw persist failed', [
                        'file' => basename($endpoint),
                        'error' => $e->getMessage(),
                    ]);
                }

                return [
                    'endpoint' => $endpoint,
                    'success' => true,
                    'url' => $url,
                    'file' => $this->storagePath . '/' . basename($endpoint),
                    'size' => $size,
                ];
            }

            return [
                'endpoint' => $endpoint,
                'success' => false,
                'error' => "HTTP {$response->status()} or file not created",
                'url' => $url,
            ];
        } catch (\Exception $e) {
            // Clean up partial file if exists
            if (file_exists($filePath)) {
                @unlink($filePath);
            }

            return [
                'endpoint' => $endpoint,
                'success' => false,
                'error' => $e->getMessage(),
                'url' => $url,
            ];
        }
    }

    /**
     * Build HTTP client with authentication and headers
     *
     * @return PendingRequest
     */
    private function buildHttpClient(): PendingRequest
    {
        $client = Http::withHeaders([
            'Accept' => 'application/json',
            'User-Agent' => 'Livegrid/1.0',
        ])
            ->timeout($this->timeout)
            ->connectTimeout($this->connectTimeout);

        $authType = Config::get('feed.auth.type');

        if ($authType === 'bearer') {
            $token = Config::get('feed.auth.token');
            if ($token) {
                $client = $client->withToken($token);
            }
        } elseif ($authType === 'basic') {
            $username = Config::get('feed.auth.username');
            $password = Config::get('feed.auth.password');
            if ($username && $password) {
                $client = $client->withBasicAuth($username, $password);
            }
        } elseif ($authType === 'query') {
            $param = Config::get('feed.auth.query_param', 'token');
            $token = Config::get('feed.auth.token');
            if ($token) {
                $client = $client->withQueryParameters([$param => $token]);
            }
        }

        return $client;
    }
}
