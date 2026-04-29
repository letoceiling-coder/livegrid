<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();
        if (! $user || ! $user->hasRole($roles)) {
            return response()->json(['message' => 'Forbidden. Role access required.'], 403);
        }

        return $next($request);
    }
}
