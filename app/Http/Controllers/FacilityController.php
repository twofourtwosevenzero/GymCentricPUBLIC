<?php

namespace App\Http\Controllers;

use App\Models\Facility;
use App\Models\Branch;
use Illuminate\Http\Request;

class FacilityController extends Controller
{
    // GET /facilities
    public function index()
    {
        // Return all facilities or optionally eager-load the branch
        $facilities = Facility::with('branch')->orderBy('FacilityID','desc')->get();
        return response()->json(['facilities' => $facilities]);
    }

    // POST /facilities
    public function store(Request $request)
    {
        $data = $request->validate([
            'BranchID'      => 'nullable|exists:branches,BranchID',
            'FacilityName'  => 'required|string|max:255',
            'Description'   => 'nullable|string',
            'Status'        => 'required|string|max:50',  // "Available", etc.
        ]);

        $facility = Facility::create($data);
        return response()->json($facility, 201); 
    }

    // GET /facilities/{id}
    public function show($id)
    {
        $facility = Facility::with('branch')->findOrFail($id);
        return response()->json($facility);
    }

    // PUT /facilities/{id}
    public function update(Request $request, $id)
    {
        $facility = Facility::findOrFail($id);

        $data = $request->validate([
            'BranchID'      => 'nullable|exists:branches,BranchID',
            'FacilityName'  => 'sometimes|string|max:255',
            'Description'   => 'nullable|string',
            'Status'        => 'sometimes|string|max:50',
        ]);

        $facility->update($data);
        return response()->json($facility);
    }

    // DELETE /facilities/{id}
    public function destroy($id)
    {
        $facility = Facility::findOrFail($id);
        $facility->delete();
        return response()->json(['message' => 'Facility deleted successfully']);
    }
}
