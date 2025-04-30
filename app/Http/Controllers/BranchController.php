<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use Illuminate\Http\Request;

class BranchController extends Controller
{
    public function indexJson(Request $request)
    {
        $context = $request->query('context');
    
        // If context=membership OR dashboard, return all branches unconditionally:
        if ($context === 'membership' || $context === 'dashboard') {
            $branches = Branch::with([
                'staff' => function($query) {
                    $query->select('staff.StaffID', 'staff.FullName');
                }
            ])->get();
    
            return response()->json(['branches' => $branches]);
        }
    
        // Otherwise, your original "admin assigned branches" or "all" logic.
        if (auth()->guard('admin')->check()) {
            // Admin: only assigned branches
            $admin = auth('admin')->user();
            $branches = $admin->branches()->with([
                'staff' => function($query) {
                    $query->select('staff.StaffID', 'staff.FullName');
                }
            ])->get();
        } else {
            // Non-admin: get all
            $branches = Branch::with([
                'staff' => function($query) {
                    $query->select('staff.StaffID', 'staff.FullName');
                }
            ])->get();
        }
    
        return response()->json(['branches' => $branches]);
    }
    
    

    public function storeJson(Request $request)
    {
        $data = $request->validate([
            'BranchName' => 'required|string|max:255',
            'Location' => 'required|string|max:255',
            'Status' => 'required|in:Active,Inactive',
            'Contact' => 'required|string|max:255'
        ]);

        $branch = Branch::create($data);
        return response()->json($branch, 201);
    }

    public function updateJson(Request $request, $id)
    {
        $branch = Branch::findOrFail($id);
        
        $data = $request->validate([
            'BranchName' => 'string|max:255',
            'Location' => 'string|max:255',
            'Status' => 'in:Active,Inactive',
            'Contact' => 'string|max:255'
        ]);

        $branch->update($data);
        return response()->json($branch);
    }

    public function destroyJson($id)
    {
        $branch = Branch::findOrFail($id);
        $branch->delete();
        return response()->json(null, 204);
    }

    public function getBranchStats() 
{
    $staff = auth('staff')->user();
    
    $query = Branch::query();
    
    if ($staff) {
        $query->where('BranchID', $staff->BranchID);
    }
    
    return response()->json([
        'total_branches' => $query->count(),
        'members_per_branch' => $query->withCount('members')->get()
    ]);
}

}