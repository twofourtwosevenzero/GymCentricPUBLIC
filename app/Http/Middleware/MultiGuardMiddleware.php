<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class MultiGuardMiddleware
{
    /**
     * Example usage in routes:
     * ->middleware('multiGuard:owner,admin,staff')
     */
    public function handle(Request $request, Closure $next, ...$guards)
    {
        foreach ($guards as $guard) {
            if (Auth::guard($guard)->check()) {
                // Ensure subsequent Auth:: calls use this guard
                Auth::shouldUse($guard);
                return $next($request);
            }
        }

        abort(403, 'Unauthorized. None of the specified guards are logged in.');
    }
}
