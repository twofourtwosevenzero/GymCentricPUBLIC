<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Support\Facades\Auth;

class CheckRole
{
    public function handle($request, Closure $next, ...$roles)
    {
        // If your user is stored in Auth::user() with a 'role' attribute
        $user = Auth::user();
        if (! $user || ! in_array($user->role, $roles)) {
            abort(403, 'Forbidden');
        }

        return $next($request);
    }
}
