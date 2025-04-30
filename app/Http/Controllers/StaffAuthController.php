<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class StaffAuthController extends Controller
{
    public function showLoginForm()
    {
        return Inertia::render('Auth/StaffLogin');
    }

    public function login(Request $request)
    {
        // Validate incoming request
        $credentials = $request->validate([
            'email'    => 'required|email',
            'password' => 'required',
        ]);

        // Attempt to log in with the 'staff' guard
        if (!Auth::guard('staff')->attempt($credentials)) {
            return response()->json([
                'errors' => ['general' => 'Invalid login credentials.'],
            ], 422);
        }

        // Regenerate session and redirect to the staff dashboard
        $request->session()->regenerate();
        return response()->json(['success' => true, 'redirect' => route('staff.dashboard')], 200);
    }

    public function logout()
    {
        Auth::guard('staff')->logout();
        return redirect()->route('staff.login')->with('success', 'Staff logged out.');
    }

    public function updateProfile(Request $request)
    {
        $user = Auth::guard('staff')->user();

        $data = $request->validate([
            'email'    => 'required|email|unique:users,email,' . $user->id,
            'password' => 'nullable|min:8|confirmed',
        ]);

        $user->email = $data['email'];
        if (!empty($data['password'])) {
            $user->password = Hash::make($data['password']);
        }
        $user->save();

        return response()->json(['message' => 'Staff profile updated successfully.'], 200);
    }
}
