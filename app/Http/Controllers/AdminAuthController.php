<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Illuminate\Support\Facades\Hash;

class AdminAuthController extends Controller
{
    public function showLoginForm()
    {
        return Inertia::render('Auth/AdminLogin');
    }

    public function login(Request $request)
    {
        // Validate incoming request
        $credentials = $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        // Attempt to log in with 'admin' guard
        if (!Auth::guard('admin')->attempt($credentials)) {
            return response()->json([
                'errors' => ['general' => 'Invalid login credentials.'],
            ], 422);
        }

        // Regenerate session and redirect to the admin dashboard
        $request->session()->regenerate();
        return response()->json(['success' => true, 'redirect' => route('admin.dashboard')], 200);
    }

    public function logout()
    {
        Auth::guard('admin')->logout();
        return redirect()->route('admin.login')->with('success', 'Admin logged out.');
    }

    public function updateProfile(Request $request)
    {
        $user = Auth::guard('admin')->user();

        $data = $request->validate([
            'email'    => 'required|email|unique:users,email,' . $user->id,
            'password' => 'nullable|min:8|confirmed',
        ]);

        $user->email = $data['email'];
        if (!empty($data['password'])) {
            $user->password = Hash::make($data['password']);
        }
        $user->save();

        return response()->json(['message' => 'Admin profile updated successfully.'], 200);
    }
    
    /**
     * Get the authenticated admin user's information including branch assignment
     */
    public function getAdminInfo()
    {
        $admin = Auth::guard('admin')->user();
        
        if (!$admin) {
            return response()->json(['error' => 'Not authenticated'], 401);
        }
        
        // Get the admin's assigned branches
        $admin->load('branches');
        $assignedBranches = $admin->branches;
        
        // Get the first assigned branch or null if none assigned
        $defaultBranchId = $assignedBranches->first() ? $assignedBranches->first()->BranchID : null;
        
        return response()->json([
            'admin' => [
                'id' => $admin->AdminID,
                'name' => $admin->FullName,
                'email' => $admin->Email,
                'role' => $admin->Role,
                'assignedBranches' => $assignedBranches,
                'defaultBranchId' => $defaultBranchId,
            ]
        ]);
    }
}
