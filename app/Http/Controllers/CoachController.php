<?php

namespace App\Http\Controllers;

use App\Models\Coach;
use App\Models\CoachAvailability;
use Illuminate\Http\Request;

class CoachController extends Controller
{
    /**
     * List all Coaches.
     * (Optionally eager-load availabilities if you want them in the same JSON.)
     */
    public function index()
    {
        $coaches = Coach::select('CoachID', 'FullName', 'Specialty', 'ContactInfo', 'Email')
        ->with('availabilities')
        ->get();
        return response()->json(['coaches' => $coaches]);
    }

    /**
     * Create a new Coach (basic fields only).
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'FullName'     => 'required|string|max:255',
            'Specialty'    => 'nullable|string|max:255',
            'ContactInfo'  => 'nullable|string|max:255',
            'Email'       => 'nullable|email|max:255', 
        ]);

        $coach = Coach::create($data);

        return response()->json([
            'message' => 'Coach created successfully.',
            'coach'   => $coach
        ], 201);
    }

    /**
     * Retrieve a single Coach.
     */
    public function show($id)
    {
        // Optionally load availabilities here too
        $coach = Coach::with('availabilities')->findOrFail($id);
        return response()->json(['coach' => $coach]);
    }

    /**
     * Update an existing Coach (basic fields only).
     */
    public function update(Request $request, $id)
    {
        $coach = Coach::findOrFail($id);

        $data = $request->validate([
            'FullName'     => 'required|string|max:255',
            'Specialty'    => 'nullable|string|max:255',
            'ContactInfo'  => 'nullable|string|max:255',
            'Email'       => 'nullable|email|max:255', 
        ]);

        // Fix: Update the existing coach instead of creating a new one
        $coach->update($data);

        return response()->json([
            'message' => 'Coach updated successfully.',
            'coach'   => $coach
        ]);
    }

    /**
     * Delete a Coach.
     */
    public function destroy($id)
    {
        $coach = Coach::findOrFail($id);
        $coach->delete();

        return response()->json(['message' => 'Coach deleted successfully.']);
    }

    /* ===================================================================
     *   AVAILABILITY SLOTS CRUD  (CoachAvailability table)
     * =================================================================== */

    /**
     * Create a new availability timeslot for a specific coach.
     * POST /coaches/{coachId}/availabilities
     */
    public function storeAvailability(Request $request, $coachId)
    {
        $coach = Coach::findOrFail($coachId);

        $data = $request->validate([
            'Start' => 'required|date_format:Y-m-d H:i:s',
            'End'   => 'required|date_format:Y-m-d H:i:s|after:Start',
        ]);

        // Create the availability slot
        $availability = $coach->availabilities()->create($data);

        return response()->json([
            'message'       => 'Availability range created successfully.',
            'availability'  => $availability
        ], 201);
    }

    /**
     * Update an existing availability timeslot.
     * PUT /coaches/{coachId}/availabilities/{availabilityId}
     */
    public function updateAvailability(Request $request, $coachId, $availabilityId)
    {
        // First, make sure the coach exists (optional if you just want to find availability by ID)
        Coach::findOrFail($coachId);

        $availability = CoachAvailability::where('CoachID', $coachId)
            ->where('id', $availabilityId)
            ->firstOrFail();

        $data = $request->validate([
            'Start' => 'required|date_format:Y-m-d H:i:s',
            'End'   => 'required|date_format:Y-m-d H:i:s|after:Start',
        ]);

        $availability->update($data);

        return response()->json([
            'message'      => 'Availability updated successfully.',
            'availability' => $availability
        ]);
    }

    /**
     * Delete an availability timeslot.
     * DELETE /coaches/{coachId}/availabilities/{availabilityId}
     */
    public function destroyAvailability($coachId, $availabilityId)
    {
        // Ensure Coach exists
        Coach::findOrFail($coachId);

        // Ensure that this availability belongs to that Coach
        $availability = CoachAvailability::where('CoachID', $coachId)
            ->where('id', $availabilityId)
            ->firstOrFail();

        $availability->delete();

        return response()->json(['message' => 'Availability deleted successfully.']);
    }


    public function generateTimeslots(Request $request, $coachId)
{
    $coach = Coach::with('availabilities')->findOrFail($coachId);

    // You can validate optional filters like date range if you want:
    $data = $request->validate([
        'start_date' => 'required|date', // e.g. 2025-01-01
        'end_date'   => 'required|date|after_or_equal:start_date', // e.g. 2025-01-31
        'branch_id'  => 'required|exists:branches,BranchID',
        // optional: 'location' => 'string',
        // optional: 'session_type' => 'string',
        // optional: 'fee' => 'numeric|min:0',
    ]);

    $startDate = \Carbon\Carbon::parse($data['start_date'])->startOfDay();
    $endDate   = \Carbon\Carbon::parse($data['end_date'])->endOfDay();

    // We'll store the newly created sessions in an array
    $createdSessions = [];

    // 1) Loop day by day, hour by hour, within the specified date range
    $current = $startDate->copy();
    while ($current->lt($endDate)) {

        // For each hour, find all coach availability slots that cover that entire hour
        foreach ($coach->availabilities as $slot) {
            $slotStart = \Carbon\Carbon::parse($slot->Start);
            $slotEnd   = \Carbon\Carbon::parse($slot->End);

            // We'll define an "hour block" from $current to $current + 1 hour
            $hourBlockStart = $current->copy();
            $hourBlockEnd   = $current->copy()->addHour();

            // Check if [hourBlockStart, hourBlockEnd] is fully within [slotStart, slotEnd]
            // That means the coach is available for that hour
            if ($hourBlockStart->greaterThanOrEqualTo($slotStart) &&
                $hourBlockEnd->lessThanOrEqualTo($slotEnd)
            ) {
                // We have an hour block the coach is available!

                // 2) Check if we already have an existing session for that exact hour
                //    (avoid duplicates if you run this more than once)
                $existing = \App\Models\CoachingSession::where('CoachID', $coachId)
                    ->where('StartTime', $hourBlockStart->format('Y-m-d H:i:s'))
                    ->where('EndTime', $hourBlockEnd->format('Y-m-d H:i:s'))
                    ->first();

                if (!$existing) {
                    // 3) Create a new CoachingSession record for that 1-hour block
                    $newSession = \App\Models\CoachingSession::create([
                        'BranchID'    => $data['branch_id'],
                        'SessionName' => '1-Hour Slot',
                        'SessionType' => $request->get('session_type', 'Regular'), 
                        'CoachID'     => $coachId,
                        'StartTime'   => $hourBlockStart,
                        'EndTime'     => $hourBlockEnd,
                        'Capacity'    => 3,  // up to 3 members
                        'Location'    => $request->get('location', null),
                        'Fee'         => $request->get('fee', 0),
                        'Participants'=> 0,
                        'Status'      => 'Scheduled',
                    ]);

                    $createdSessions[] = $newSession;
                }
            }
        }

        // Move $current forward by 1 hour
        $current->addHour();
    }

    return response()->json([
        'message'           => 'Timeslots generated successfully.',
        'created_sessions'  => $createdSessions,
    ]);
}

}
