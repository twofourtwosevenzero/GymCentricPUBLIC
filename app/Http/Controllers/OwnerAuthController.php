<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class OwnerAuthController extends Controller
{
    /**
     * Show the Owner login form.
     */
    public function showLoginForm()
    {
        return Inertia::render('Auth/OwnerLogin');
    }

    /**
     * Handle the Owner login request.
     */
    public function login(Request $request)
    {
        // Validate the incoming request
        $credentials = $request->validate([
            'email'    => 'required|email',
            'password' => 'required',
        ], [
            'email.required' => 'Email is required.',
            'email.email'    => 'Please provide a valid email address.',
            'password.required' => 'Password is required.',
        ]);

        // Optional "remember me" checkbox
        $remember = $request->boolean('remember', false);

        // Check if the login attempt is successful
        if (!Auth::guard('owner')->attempt($credentials, $remember)) {
            // Return a single error message
            return response()->json([
                'errors' => ['general' => 'Invalid log-in credentials.'],
            ], 422);
        }

        // Regenerate session to prevent fixation attacks
        $request->session()->regenerate();

        // Redirect to the Owner Dashboard
        return response()->json(['success' => true, 'redirect' => route('owner.dashboard')], 200);
    }

    /**
     * Log the Owner out of the application.
     */
    public function logout(Request $request)
    {
        Auth::guard('owner')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();
    
        // Redirect to the root route
        return redirect()->route('root');  // Redirects to the home page or a public page
    }

    public function updateProfile(Request $request)
    {
        $user = Auth::guard('owner')->user();

        $data = $request->validate([
            'email'    => 'required|email|unique:users,email,' . $user->id,
            'password' => 'nullable|min:8|confirmed',
        ]);

        $user->email = $data['email'];
        if (!empty($data['password'])) {
            $user->password = Hash::make($data['password']);
        }
        $user->save();

        return response()->json(['message' => 'Owner profile updated successfully.'], 200);
    }
    
}
    