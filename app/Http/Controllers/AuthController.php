<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class AuthController extends Controller
{
    /**
     * Check if the user is authenticated as an owner
     */
    public function checkAuth(Request $request)
    {
        $isAuthenticated = auth()->guard('owner')->check();
        
        return response()->json([
            'authenticated' => $isAuthenticated,
            'user' => $isAuthenticated ? auth()->guard('owner')->user() : null
        ]);
    }
} 