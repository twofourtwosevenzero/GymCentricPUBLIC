<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\DailyCashFlow;
use App\Models\Expense;
use App\Models\Member;
use App\Models\MembershipPlan;
use App\Models\Attendance;
use App\Models\Staff;
use App\Models\StaffTask;
use App\Models\Booking;
use App\Models\Branch;
use App\Models\Facility;

class ReportsController extends Controller
{
    public function index(Request $request)
    {
        $branch   = $request->query('branch');
        $dateFrom = $request->query('dateFrom');
        $dateTo   = $request->query('dateTo');

        // Helper for partial date filtering
        $applyDateFilter = function ($query, $column) use ($dateFrom, $dateTo) {
            if ($dateFrom && $dateTo) {
                $query->whereBetween($column, [$dateFrom, $dateTo]);
            } elseif ($dateFrom) {
                $query->where($column, '>=', $dateFrom);
            } elseif ($dateTo) {
                $query->where($column, '<=', $dateTo);
            }
        };

        // -----------------------------------------------------
        // 1) Finance (DailyCashFlow & Expense)
        // -----------------------------------------------------
        $cashFlowQuery = DailyCashFlow::with('branch');  // Eager load branch

        if ($branch && $branch !== 'All Branches') {
            $cashFlowQuery->where('BranchID', $branch);
        }
        $applyDateFilter($cashFlowQuery, 'Date');

        $cashFlowRecords = $cashFlowQuery->get();
        $totalRevenue    = $cashFlowQuery->sum('TotalSales');

        $expenseQuery = Expense::with('branch'); // Eager load branch
        if ($branch && $branch !== 'All Branches') {
            $expenseQuery->where('BranchID', $branch);
        }
        $applyDateFilter($expenseQuery, 'ExpenseDate');

        $expenses      = $expenseQuery->get();
        $totalExpenses = $expenseQuery->sum('Amount');

        // -----------------------------------------------------
        // 2) Membership (Members, MembershipPlan)
        // -----------------------------------------------------
        // A) Members
        $membersQuery = Member::with([
            'startedBranch',   // so we can see startedBranch->BranchID
            'plan',            // in case we need the plan info
        ]);
        if ($branch && $branch !== 'All Branches') {
            $membersQuery->where('StartedBranchID', $branch);
        }
        $applyDateFilter($membersQuery, 'MembershipStartDate');
        $members = $membersQuery->get();

        // membership growth => group by month
        $membershipGrowth = $members
            ->groupBy(fn($m) => date('Y-m', strtotime($m->MembershipStartDate)))
            ->map(fn($group) => $group->count());

        // B) Membership Plans => with members->startedBranch
        $plans = MembershipPlan::with(['members.startedBranch' => function ($q) use ($branch, $dateFrom, $dateTo) {
            if ($branch && $branch !== 'All Branches') {
                $q->where('StartedBranchID', $branch);
            }
            if ($dateFrom && $dateTo) {
                $q->whereBetween('MembershipStartDate', [$dateFrom, $dateTo]);
            } elseif ($dateFrom) {
                $q->where('MembershipStartDate', '>=', $dateFrom);
            } elseif ($dateTo) {
                $q->where('MembershipStartDate', '<=', $dateTo);
            }
        }])->get();

        $membershipPlans = $plans->map(function ($plan) {
            return [
                'PlanID'        => $plan->PlanID,
                'PlanName'      => $plan->PlanName,
                'Price'         => $plan->Price,
                'Duration'      => $plan->Duration,
                'members_count' => $plan->members->count(),
            ];
        });

        // -----------------------------------------------------
        // 3) Staff
        // -----------------------------------------------------
        // If you want to fetch ALL staff, with branches, attendances, tasks, etc.
        // Then you can do something like:
        $staff = Staff::with([
            'branches',      // staff->branches pivot
            'attendances',   // staff->attendances
            'tasks',         // staff->tasks
            'schedules',     // staff->schedules
            'bonuses',
            // etc. as needed
        ])->get();

        // If you want just attendance records, see below. But let's keep:
        $attendanceQuery = Attendance::with([
            'staff.branches', // each attendance has staff->branches pivot
        ]);
        if ($branch && $branch !== 'All Branches') {
            $attendanceQuery->whereHas('staff.branches', function ($q) use ($branch) {
                $q->where('branch_staff.BranchID', $branch);
            });
        }
        $applyDateFilter($attendanceQuery, 'Date');
        $attendanceRecords = $attendanceQuery->get();

        // group attendance by year-week
        $weeklyAttendance = $attendanceRecords
            ->groupBy(function ($att) {
                $year = date('Y', strtotime($att->Date));
                $week = date('W', strtotime($att->Date));
                return $year . '-W' . $week;
            })
            ->map(fn($group) => ['totalAttendance' => $group->count()]);

        // Staff Performance (StaffTask)
        $tasksQuery = StaffTask::with([
            'staff.branches',
        ]);
        if ($branch && $branch !== 'All Branches') {
            $tasksQuery->whereHas('staff.branches', function ($q) use ($branch) {
                $q->where('branch_staff.BranchID', $branch);
            });
        }
        $applyDateFilter($tasksQuery, 'TaskDate');
        $staffTasks = $tasksQuery->get();

        $staffPerformance = $staffTasks
            ->groupBy('StaffID')
            ->map(function ($group, $staffId) {
                $completed = $group->where('Status', 'Completed')->count();
                return [
                    'StaffID'        => $staffId,
                    'tasksCompleted' => $completed,
                ];
            })
            ->values();

        // -----------------------------------------------------
        // 4) Booking
        // -----------------------------------------------------
        // Eager load facility->branch + member->startedBranch
        $bookingQuery = Booking::with([
            'facility.branch',
            'member.startedBranch',
        ]);
        if ($branch && $branch !== 'All Branches') {
            $bookingQuery->whereHas('facility', function ($q) use ($branch) {
                $q->where('BranchID', $branch);
            });
        }
        $applyDateFilter($bookingQuery, 'BookingDate');
        $bookings = $bookingQuery->get();

        // (A) popular facility
        $mostPopularService = $bookings
            ->groupBy(fn($bk) => optional($bk->facility)->FacilityName)
            ->sortByDesc(fn($group) => count($group))
            ->keys()
            ->first() ?? 'N/A';

        // (B) booking trends => monthly
        $bookingTrends = $bookings
            ->groupBy(fn($bk) => date('Y-m', strtotime($bk->BookingDate)))
            ->map(fn($group) => ['totalBookings' => $group->count()]);

        // -----------------------------------------------------
        // 5) Branches
        // -----------------------------------------------------
        $allBranches = Branch::with([
            'staff',          // or staffAssignments
            'facilities',
            'startedMembers', // i.e. members with StartedBranchID
        ])->orderBy('BranchName')->get();

        // -----------------------------------------------------
        // 6) Return JSON
        // -----------------------------------------------------
        return response()->json([
            'finance' => [
                'cashFlowRecords' => $cashFlowRecords,
                'totalRevenue'    => $totalRevenue,
                'expenses'        => $expenses,
                'totalExpenses'   => $totalExpenses,
            ],
            'membership' => [
                'growth' => $membershipGrowth,
                'plans'  => $membershipPlans,
                'members' => $members,    // if you also want all raw member records
            ],
            'staff' => [
                'allStaff'          => $staff,               // entire staff list
                'attendanceRecords' => $attendanceRecords,   // with staff->branches
                'weeklyAttendance'  => $weeklyAttendance,
                'performance'       => $staffPerformance,    // staff tasks
            ],
            'booking' => [
                'bookings'            => $bookings,          // if you want raw booking data
                'mostPopularService'  => $mostPopularService,
                'trends'              => $bookingTrends,
            ],
            'branches' => $allBranches,
        ]);
    }
}
