<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Adds X-Response-Time header (milliseconds) to every API response.
 * The start time is captured at the very beginning of the request lifecycle
 * via Laravel's LARAVEL_START constant (set in public/index.php).
 */
class RecordResponseTime
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $startTime = defined('LARAVEL_START') ? LARAVEL_START : microtime(true);
        $elapsed   = round((microtime(true) - $startTime) * 1000, 1);

        $response->headers->set('X-Response-Time', $elapsed . 'ms');

        return $response;
    }
}
