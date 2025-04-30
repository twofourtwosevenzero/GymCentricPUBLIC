<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Booking;
use App\Models\Facility;
use App\Models\Member;
use App\Models\CoachingSession;
use App\Models\SessionBooking;
use App\Models\SessionWaitlist;
use App\Models\SessionAttendance;
use App\Models\Coach;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Carbon\Carbon;

class BookingController extends Controller
{
    /* ------------------------------------------------------------------
     *  N. BOOKING (Table #6)
     * ------------------------------------------------------------------ */

    /**
     * Return Bookings in JSON, including branch info
     */
    public function indexBooking(Request $request)
    {
        $staff = auth('staff')->user();
        $query = Booking::with(['member', 'facility.branch']);
    
        if ($staff) {
            $branchIDs = $staff->branches->pluck('BranchID')->toArray();
            $query->whereHas('facility', function ($q) use ($branchIDs) {
                $q->whereIn('BranchID', $branchIDs);
            });
        }
    
        if ($request->filled('branch')) {
            $branchName = $request->get('branch');
            $query->whereHas('facility.branch', function ($q) use ($branchName) {
                $q->where('BranchName', $branchName);
            });
        }
    
        $bookings = $query->orderBy('BookingDate', 'desc')->get();
    
        $data = $bookings->map(function ($b) {
            return [
                'BookingID'    => $b->BookingID,
                'BranchID'     => optional(optional($b->facility)->branch)->BranchID ?? null,
                'Branch'       => optional(optional($b->facility)->branch)->BranchName ?? '',
                // Prefer MemberName; if empty, use GuestName (if available)
                'MemberName'   => optional($b->member)->FullName ?: $b->GuestName,
                // Optionally, also return guest details separately:
                'GuestName'    => $b->GuestName ?? '',
                'GuestEmail'   => $b->GuestEmail ?? '',
                'FacilityID'   => optional($b->facility)->FacilityID ?? null,
                'FacilityName' => optional($b->facility)->FacilityName ?? '',
                'BookingDate'  => $b->BookingDate,
                'BookingTime'  => $b->BookingTime,
                'Duration'     => $b->Duration,
                'Status'       => $b->Status ?? '',
            ];
        });
    
        return response()->json(['bookings' => $data]);
    }
    

    /**
     * Store a new Booking (Facility + Payment).
     */
    public function storeBooking(Request $request)
    {
        $staff = auth('staff')->user();

        $data = $request->validate([
            'MemberID'      => 'nullable|exists:members,MemberID',
            'GuestName'     => 'nullable|string|max:255',
            'GuestEmail'    => 'nullable|email|max:255',
            'FacilityID'    => 'required|exists:facilities,FacilityID',
            'BookingDate'   => 'required|date',
            'BookingTime'   => 'required|string|max:20',
            'Duration'      => 'nullable|integer|min:1',
            'Status'        => 'nullable|string|max:50'
        ]);

        // Check facility belongs to staff's branch if staff is logged in
        if ($staff) {
            $facility = Facility::findOrFail($data['FacilityID']);
            $branchIDs = $staff->branches->pluck('BranchID')->toArray();
            if (!in_array($facility->BranchID, $branchIDs)) {
                abort(403, 'You cannot create a booking for a facility outside your branch.');
            }
        } else {
            // For non-staff, just load facility for branch ID
            $facility = Facility::findOrFail($data['FacilityID']);
        }

        return DB::transaction(function () use ($data, $facility) {
            // Create Booking without payment
            $booking = Booking::create([
                'MemberID'    => $data['MemberID'],
                'FacilityID'  => $data['FacilityID'],
                'BookingDate' => $data['BookingDate'],
                'BookingTime' => $data['BookingTime'],
                'Duration'    => $data['Duration'] ?? 1,
                'Status'      => $data['Status']   ?? 'Pending', // Set as Pending until payment is made
                'GuestName'   => $data['GuestName'] ?? null,
                'GuestEmail'  => $data['GuestEmail'] ?? null,
            ]);

            return response()->json([
                'message' => 'Booking created successfully. Please process the payment separately.',
                'booking' => $booking
            ], 201);
        });
    }

    public function updateBooking(Request $request, $id)
{
    // 1) Validate input
    $data = $request->validate([
        'MemberID'   => 'nullable|exists:members,MemberID',
        'GuestName'  => 'nullable|string|max:255',
        'GuestEmail' => 'nullable|email|max:255',
        'FacilityID' => 'required|exists:facilities,FacilityID',
        'BookingDate'=> 'required|date',
        'BookingTime'=> 'required',
        'Duration'   => 'nullable|integer|min:1',
        'Status'     => 'nullable|string|max:50',
        'PaymentMethod' => 'nullable|string|max:50',
        'Amount'     => 'nullable|numeric|min:0',
    ]);

    // 2) Find the booking
    $booking = Booking::findOrFail($id);

    // 3) If it's a member booking
    if (!empty($data['MemberID'])) {
        $booking->MemberID   = $data['MemberID'];
        $booking->GuestName  = null;
        $booking->GuestEmail = null;
    } else {
        // If it's a guest booking (no MemberID)
        $booking->MemberID   = null;
        $booking->GuestName  = $data['GuestName']  ?? null;
        $booking->GuestEmail = $data['GuestEmail'] ?? null;
    }

    // 4) Update the rest
    $booking->FacilityID  = $data['FacilityID'];
    $booking->BookingDate = $data['BookingDate'];
    $booking->BookingTime = $data['BookingTime'];
    $booking->Duration    = $data['Duration'] ?? 1;
    $booking->Status      = $data['Status']   ?? 'Confirmed';

    // Payment method & amount if you store them in the booking itself or in related table
    // (If you have a separate Payment model, adapt accordingly.)
    if (isset($data['PaymentMethod'])) {
        $booking->PaymentMethod = $data['PaymentMethod'];
    }
    if (isset($data['Amount'])) {
        $booking->Amount = $data['Amount'];
    }

    // 5) Save
    $booking->save();

    return response()->json([
        'message' => 'Booking updated successfully.',
        'booking' => $booking,
    ]);
}

    /* --------------------------------------------------------------
     *  Coaches & Facilities Index
     * -------------------------------------------------------------- */
    public function index()
    {
        $coaches = Coach::orderBy('FullName')->get();
        return response()->json(['coaches' => $coaches]);
    }

    public function indexFacilities()
    {
        $facilities = Facility::orderBy('FacilityName', 'asc')->get();
        return response()->json(['facilities' => $facilities]);
    }

    /* ------------------------------------------------------------------
     * O. COACHING SESSIONS
     * ------------------------------------------------------------------ */

    /**
     * Return coaching sessions in JSON, with branch filtering
     */
    public function indexSessions(Request $request)
    {
        $staff = auth('staff')->user();
        $query = CoachingSession::with(['coach', 'branch'])
            ->select([
                'SessionID', 
                'BranchID', 
                'SessionName', 
                'SessionType', 
                'CoachID', 
                'StartTime', 
                'EndTime', 
                'Capacity', 
                'Location', 
                'Fee', 
                'Participants', 
                'Status'
            ]);
    
        // If staff is authenticated, filter sessions by assigned branches
        if ($staff) {
            $branchIDs = $staff->branches->pluck('BranchID');
            $query->whereIn('BranchID', $branchIDs);
        }
    
        // Filter by branch name if provided
        if ($request->filled('branch')) {
            $branchParam = $request->get('branch');
            $query->whereHas('branch', function ($q) use ($branchParam) {
                $q->where('BranchName', $branchParam);
            });
        }
    
        // Order sessions by latest start time
        $sessions = $query->orderBy('StartTime', 'desc')->get();
    
        // Format response data
        $data = $sessions->map(function ($s) {
            return [
                'SessionID'    => $s->SessionID,
                'Branch'       => optional($s->branch)->BranchName ?? '',
                'SessionName'  => $s->SessionName,
                'SessionType'  => $s->SessionType ?? '',
                'CoachID'      => $s->CoachID, // Add this line
                'CoachName'    => optional($s->coach)->FullName ?? '',
                'StartTime'    => $s->StartTime ?? '',
                'EndTime'      => $s->EndTime ?? '',
                'Capacity'     => $s->Capacity,
                'Location'     => $s->Location ?? '',
                'Fee'          => $s->Fee ? number_format($s->Fee, 2) : '0.00',
                'Participants' => $s->Participants ?? 0,
                'Status'       => $s->Status ?? '',
            ];
        });
    
        return response()->json(['sessions' => $data]);
    }
    
    /**
     * Create a new Coaching Session
     */
    public function storeSession(Request $request)
    {
        // Validate all fields
        $data = $request->validate([
            'BranchID'    => 'required|integer|exists:branches,BranchID',
            'SessionName' => 'required|string|max:255',
            'SessionType' => 'required|string|max:50',
            'CoachID'     => 'required|exists:coaches,CoachID',

            // Using 'Y-m-d H:i:s'
            'StartTime'   => 'required|date_format:Y-m-d H:i:s',
            'EndTime'     => 'required|date_format:Y-m-d H:i:s|after:StartTime',

            'Capacity'    => 'nullable|integer|min:1',
            'Location'    => 'nullable|string|max:255',
            'Fee'         => 'nullable|numeric|min:0',
        ]);

        // Fetch the Coach so we can check availability:
        $coach = Coach::findOrFail($data['CoachID']);

        // If you have an actual method isAvailableBetween() in the Coach model:
        if (!$coach->isAvailableBetween($data['StartTime'], $data['EndTime'])) {
            return response()->json([
                'error' => 'Coach is not available at that time.'
            ], 422);
        }

        // Create the session
        $session = CoachingSession::create([
            'BranchID'    => $data['BranchID'],
            'SessionName' => $data['SessionName'],
            'SessionType' => $data['SessionType'],
            'CoachID'     => $data['CoachID'],
            'StartTime'   => $data['StartTime'],  // "YYYY-MM-DD HH:mm:ss"
            'EndTime'     => $data['EndTime'],    // "YYYY-MM-DD HH:mm:ss"
            'Capacity'    => $data['Capacity'] ?? 10,
            'Location'    => $data['Location'] ?? null,
            'Fee'         => $data['Fee'] ?? 0,
            'Participants'=> 0,
            'Status'      => 'Scheduled', // or whatever default status
        ]);

        return response()->json([
            'message' => 'Session created successfully.',
            'session' => $session,
        ], 201);
    }

    /**
     * Update an existing Coaching Session
     */
    public function updateSession(Request $request, $id)
    {
        // Validate
        $data = $request->validate([
            'SessionName'  => 'required|string|max:255',
            'BranchID'     => 'required|integer|exists:branches,BranchID',
            'SessionType'  => 'required|string|max:50',
            'CoachID'      => 'required|exists:coaches,CoachID',

            // "Y-m-d H:i:s" format (EndTime is nullable, but must be after StartTime if supplied)
            'StartTime'    => 'required|date_format:Y-m-d H:i:s',
            'EndTime'      => 'nullable|date_format:Y-m-d H:i:s|after:StartTime',

            'Capacity'     => 'nullable|integer|min:1',
            'Location'     => 'nullable|string|max:255',
            'Fee'          => 'nullable|numeric|min:0',
            'Status'       => 'nullable|string|max:50',
        ]);

        // Fetch the existing session
        $session = CoachingSession::findOrFail($id);

        // Check the coach's availability only if both Start & End times are provided.
        // (If EndTime is null, your DB might allow it, or you might handle that differently.)
        if (!empty($data['StartTime']) && !empty($data['EndTime'])) {
            $coach = Coach::findOrFail($data['CoachID']);

            if (!$coach->isAvailableBetween($data['StartTime'], $data['EndTime'])) {
                return response()->json([
                    'error' => 'Coach is not available at that time.'
                ], 422);
            }
        }

        // Update the session
        $session->update($data);

        return response()->json([
            'message' => 'Session updated successfully.',
            'session' => $session, // Optionally return the updated session
        ]);
    }


    public function cancelSession($id)
    {
        $session = CoachingSession::findOrFail($id);
        $session->delete(); // or set Status="Cancelled"
    
        return response()->json(['message' => 'Session successfully deleted.']);
    }
    

    /**
     * Store a Session Booking, now with Payment creation here.
     */
    public function storeSessionBooking(Request $request)
    {
        $data = $request->validate([
            'SessionID'     => 'required|exists:coaching_sessions,SessionID',
            'MemberID'      => 'required|exists:members,MemberID',
            'BookingDate'   => 'required|date',
            'Status'        => 'nullable|string|max:50'
        ]);
    
        return DB::transaction(function () use ($data) {
            $session = CoachingSession::find($data['SessionID']);
            if (!$session) {
                return response()->json(['message' => 'Session not found.'], 404);
            }
    
            // 1) Check capacity
            if ($session->Participants >= $session->Capacity) {
                return response()->json(
                    ['message' => 'Cannot book. Session capacity reached.'],
                    422 // Unprocessable
                );
            }
    
            // 2) Increment participants
            $session->Participants = ($session->Participants ?? 0) + 1;
            $session->save();
    
            // 3) Create the SessionBooking without payment
            $sb = SessionBooking::create([
                'SessionID'   => $session->SessionID,
                'MemberID'    => $data['MemberID'],
                'BookingDate' => $data['BookingDate'],
                'Status'      => $data['Status'] ?? 'Pending' // Set as Pending until payment is made
            ]);
    
            return response()->json([
                'message' => 'Session booked successfully. Please process the payment separately.',
                'session_booking' => $sb
            ]);
        });
    }
    
    /**
     * NEW: listSessionBookings
     */
    public function listSessionBookings()
    {
        $entries = SessionBooking::with(['session','member'])->get();

        $data = $entries->map(function($sb) {
            return [
                'SessionBookingID' => $sb->SessionBookingID,
                'SessionID'        => $sb->SessionID,
                'SessionName'      => optional($sb->session)->SessionName ?? '',
                'MemberID'         => $sb->MemberID,
                'MemberName'       => optional($sb->member)->FullName ?? '',
                'BookingDate'      => $sb->BookingDate,
                'Status'           => $sb->Status,
            ];
        });

        return response()->json(['session_bookings' => $data]);
    }

    /**
     * Waitlist
     */
    public function addToWaitlist(Request $request)
    {
        $data = $request->validate([
            'SessionID'    => 'required|exists:coaching_sessions,SessionID',
            'MemberID'     => 'required|exists:members,MemberID',
            'WaitlistDate' => 'nullable|date',
            'Status'       => 'nullable|string|max:50',
        ]);
        SessionWaitlist::create($data);
        return response()->json(['message' => 'Added to waitlist.']);
    }

    /**
     * Attendance
     */
    public function markAttendance(Request $request)
    {
        $data = $request->validate([
            'SessionID'      => 'required|exists:coaching_sessions,SessionID',
            'MemberID'       => 'required|exists:members,MemberID',
            'AttendanceDate' => 'required|date',
        ]);
        SessionAttendance::create($data);
        return response()->json(['message' => 'Attendance marked successfully.']);
    }

    /**
     * Popular Booking
     */
    public function mostPopular()
    {
        $popularBooking = DB::table('bookings')
            ->select('FacilityID', DB::raw("COUNT(*) as count"))
            ->whereYear('BookingDate', date('Y'))
            ->whereMonth('BookingDate', date('m'))
            ->groupBy('FacilityID')
            ->orderByDesc('count')
            ->first();

        $mostPopular = 'N/A';
        if ($popularBooking) {
            $facility = DB::table('facilities')->where('FacilityID', $popularBooking->FacilityID)->first();
            if ($facility) {
                $mostPopular = $facility->FacilityName ?? $facility->Name;
            }
        }

        return response()->json([
            'most_popular_service' => $mostPopular,
            'booking_count'        => $popularBooking->count ?? 0,
        ], 200);
    }

    /**
     * Booking Trends
     */
    public function bookingTrends()
    {
        $trends = DB::table('bookings')
            ->select(DB::raw("DATE_FORMAT(BookingDate, '%b %Y') as month"), DB::raw("COUNT(*) as totalBookings"))
            ->groupBy('month')
            ->orderByRaw("MIN(BookingDate)")
            ->get();

        return response()->json($trends, 200);
    }

    /**
     * Today Bookings
     */
    public function getTodayBookings()
    {
        $staff = auth('staff')->user();
        $today = Carbon::now()->format('Y-m-d');
    
        $query = Booking::with(['member','facility'])
            ->whereDate('BookingDate', $today)
            ->orderBy('BookingTime', 'asc');
    
        // Restrict to staff's branches
        if ($staff) {
            $branchIDs = $staff->branches->pluck('BranchID')->toArray();
            $query->whereHas('facility', function($q) use ($branchIDs) {
                $q->whereIn('BranchID', $branchIDs);
            });
        }
    
        $bookings = $query->get();
    
        $results = $bookings->map(function($b) {
            return [
                'BookingID'   => $b->BookingID,
                'MemberName'  => optional($b->member)->FullName,
                'BookingDate' => $b->BookingDate,
                'BookingTime' => $b->BookingTime,
                'FacilityName'=> optional($b->facility)->FacilityName,
            ];
        });
    
        return response()->json($results, 200);
    }

    public function destroyBooking($id)
{
    $booking = Booking::findOrFail($id);
    $booking->payment()->delete();

    $booking->delete();

    return response()->json(['message' => 'Booking deleted successfully.']);
}

    
}