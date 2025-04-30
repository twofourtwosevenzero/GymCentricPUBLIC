<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use App\Models\Payment;
use App\Models\WalkIn;
use App\Models\MemberVisit;
use App\Models\Notification;

class StaffDashboardController extends Controller
{
    public function index(Request $request)
    {
        // If the request expects JSON (e.g., an API call) return the data.
        if ($request->wantsJson() || $request->ajax()) {
            $staff = auth('staff')->user();
            // Get the staff's primary branch via the pivot.
            $branch = $staff->branches()->first();
            if (!$branch) {
                return response()->json([
                    'error' => 'No branch assigned to this staff member.'
                ], 403);
            }
            $branchId = $branch->BranchID;

            // ---------------- Metrics ----------------
            // Count today's check-ins from member_visits.
            $attendanceToday = \DB::table('member_visits')
                ->where('BranchID', $branchId)
                ->whereDate('VisitDate', Carbon::today()->toDateString())
                ->count();
            
            $members = \App\Models\Member::select('MemberID','FullName')->get();
            // Total check-ins for the branch.
            $totalCheckIns = \DB::table('member_visits')
                ->where('BranchID', $branchId)
                ->count();

            // Pending payments sum.
            $pendingPayments = Payment::where('BranchID', $branchId)
                ->where('Status', 'Pending')
                ->sum('Amount');

            // Compute walk-in revenue by joining walk_ins with payments.
            $walkInRevenue = \DB::table('walk_ins')
                ->join('payments', 'walk_ins.PaymentID', '=', 'payments.PaymentID')
                ->where('walk_ins.BranchID', $branchId)
                ->where('payments.Status', 'Completed')
                ->sum('payments.Amount');

            // ---------------- Attendance Records ----------------
            // Retrieve the 10 most recent member check-in records.
            $memberVisits = MemberVisit::where('BranchID', $branchId)
                ->orderBy('VisitDate', 'desc')
                ->orderBy('VisitTime', 'desc')
                ->take(10)
                ->get();

            // ---------------- Payment Processing ----------------
            $recentTransactions = Payment::where('BranchID', $branchId)
                ->orderBy('PaymentDate', 'desc')
                ->take(10)
                ->get();

            // ---------------- Walk-in Management ----------------
            $walkInsRecent = WalkIn::where('BranchID', $branchId)
                ->orderBy('VisitDate', 'desc')
                ->take(10)
                ->get();

            // ---------------- Notifications & Alerts ----------------
            // Assuming notifications for staff are determined by EventTrigger values.
            $notifications = Notification::whereIn('EventTrigger', ['Announcement', 'StaffNotice', 'AdHoc'])
                ->orderBy('SentDate', 'desc')
                ->get();
            return response()->json([
                'attendanceToday'    => $attendanceToday,
                'totalCheckIns'      => $totalCheckIns,
                'pendingPayments'    => (float)$pendingPayments,
                'walkInRevenue'      => (float)$walkInRevenue,
                'memberVisits'       => $memberVisits,
                'recentTransactions' => $recentTransactions,
                'walkIns'            => [
                    'recent'  => $walkInsRecent,
                    'revenue' => (float)$walkInRevenue,
                ],
                'notifications'      => $notifications,
                'members'            => $members,
            ]);
        }

        // For HTML requests, return your React app view (or Inertia view).
        return \Inertia\Inertia::render('Staff/DashboardLayoutWrapper');
    }
}
