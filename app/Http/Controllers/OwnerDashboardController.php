<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Illuminate\Http\Request;
use App\Models\Payment;
use App\Models\Member;
use App\Models\Expense;
use App\Models\MemberVisit;
use App\Models\MembershipRenewal;
use App\Models\MembershipPlan;
use App\Models\WalkIn;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class OwnerDashboardController extends Controller
{
    /**
     * Render the main Owner (Super Admin) Dashboard via Inertia.
     */
    public function index()
    {
        $dashboardData = [
            'title' => 'Owner (Super Admin) Dashboard',
            'info'  => 'Any data relevant to the Super Admin',
        ];

        return Inertia::render('Owner/DashboardLayoutWrapper', $dashboardData);
    }

    /**
     * Return key metrics and notifications for the Owner Dashboard.
     *
     * Supports query parameters:
     * - period   (daily, weekly, monthly, yearly)
     * - dateFrom (YYYY-MM-DD)
     * - dateTo   (YYYY-MM-DD)
     * - branch   (branch ID or 'all')
     */
    public function metrics(Request $request)
    {
        $period   = $request->query('period', 'monthly');
        $dateFrom = $request->query('dateFrom');
        $dateTo   = $request->query('dateTo');
        $branch   = $request->query('branch', 'all');

        // 1) Build query for payments that are 'Completed' or 'Paid',
        //    ensuring we include facility/coaching/membership payments.
        $paymentsQuery = Payment::whereIn('Status', ['Completed','Paid']);

        // If branch != 'all', limit by BranchID
        if ($branch !== 'all') {
            $paymentsQuery->where('BranchID', $branch);
        }

        // If dateFrom/dateTo set => filter by PaymentDate
        if (!empty($dateFrom)) {
            $paymentsQuery->whereDate('PaymentDate', '>=', $dateFrom);
        }
        if (!empty($dateTo)) {
            $paymentsQuery->whereDate('PaymentDate', '<=', $dateTo);
        }

        // Sum all amounts => totalRevenue
        $totalRevenue = $paymentsQuery->sum('Amount');

        // 2) Calculate total expenses
        $expensesQuery = Expense::query();
        if ($branch !== 'all') {
            $expensesQuery->where('BranchID', $branch);
        }
        if (!empty($dateFrom)) {
            $expensesQuery->whereDate('ExpenseDate', '>=', $dateFrom);
        }
        if (!empty($dateTo)) {
            $expensesQuery->whereDate('ExpenseDate', '<=', $dateTo);
        }
        $totalExpenses = $expensesQuery->sum('Amount');

        // 3) Example metrics: # of members, # of "emails sent," etc.
        $totalEmailsSent = Member::count();
        $totalClients    = Member::count(); // or some other logic

        // 4) Dummy traffic
        $trafficReceived = 1000;

        // 5) Dummy notifications
        $notifications = [
            ['message' => 'New transaction completed: TXN001'],
            ['message' => 'Revenue milestone reached: $500,000'],
            ['message' => 'New client added: Company ABC'],
            ['message' => 'System update available: Version 2.3'],
            ['message' => 'Performance review scheduled for next week'],
            ['message' => 'Reminder: Monthly report due in 3 days'],
            ['message' => 'New member registered: John Doe'],
            ['message' => 'Website traffic spike detected'],
            ['message' => 'New feature release: Dark mode now available'],
            ['message' => 'System maintenance scheduled for tomorrow'],
        ];

        return response()->json([
            'metrics' => [
                'totalRevenue'    => $totalRevenue,
                'totalExpenses'   => $totalExpenses,
                'totalEmailsSent' => $totalEmailsSent,
                'totalClients'    => $totalClients,
                'trafficReceived' => $trafficReceived,
            ],
            'notifications' => $notifications,
        ]);
    }

    /**
     * Return member activity metrics for today
     * - Count of member logins today
     * - Count of subscription renewals today
     * - Breakdown of renewals by plan price
     * - Count of walk-ins today
     * - Count of new sign-ups today
     * - Detailed information about individuals who logged in, renewed, walked in, or signed up today
     */
    public function memberMetrics(Request $request)
    {
        try {
            $branch = $request->query('branch', 'all');
            
            // Explicitly set timezone to match config
            $timezone = config('app.timezone', 'Asia/Manila');
            $today = Carbon::now($timezone)->startOfDay();
            
            // Log the date being used for debugging
            \Log::info('Member metrics date: ' . $today->toDateTimeString() . ' (Timezone: ' . $timezone . ')');
        
            // 1) Member logins (via visits)
            $visitsQuery = MemberVisit::query()
                ->whereDate('VisitDate', $today)
                // JOIN members so we can check members.StartedBranchID
                ->join('members', 'member_visits.MemberID', '=', 'members.MemberID');
        
            if ($branch !== 'all') {
                $visitsQuery->where('members.StartedBranchID', $branch);
            }
        
            // Distinct because 1 member might log in multiple times
            $loginsToday = $visitsQuery->distinct('member_visits.MemberID')->count('member_visits.MemberID');
            
            // Get detailed information about members who logged in today
            $loggedInMembersQuery = MemberVisit::select(
                    'members.MemberID',
                    'members.FullName',
                    'members.Email',
                    'members.Phone',
                    'membership_plans.PlanName',
                    'member_visits.VisitDate',
                    'branches.BranchName'
                )
                ->join('members', 'member_visits.MemberID', '=', 'members.MemberID')
                ->join('membership_plans', 'members.PlanID', '=', 'membership_plans.PlanID')
                ->join('branches', 'members.StartedBranchID', '=', 'branches.BranchID')
                ->whereDate('member_visits.VisitDate', $today);
                
            if ($branch !== 'all') {
                $loggedInMembersQuery->where('members.StartedBranchID', $branch);
            }
            
            $loggedInMembers = $loggedInMembersQuery->distinct('members.MemberID')->get();
        
            // 2) Renewals
            $renewalsQuery = MembershipRenewal::query()
                ->whereDate('RenewalDate', $today)
                // same approach: join members to see which branch the renewing member belongs to
                ->join('members', 'membership_renewals.MemberID', '=', 'members.MemberID');
        
            if ($branch !== 'all') {
                $renewalsQuery->where('members.StartedBranchID', $branch);
            }
        
            $renewalsToday = $renewalsQuery->count();
        
            // 3) Renewal breakdown
            //    This time we also join membership_plans. 
            //    We'll do the grouping after the join.
            $renewalBreakdownQuery = MembershipRenewal::select(
                    'membership_plans.Price',
                    DB::raw('COUNT(*) as count')
                )
                ->join('membership_plans', 'membership_renewals.PlanID', '=', 'membership_plans.PlanID')
                ->join('members', 'membership_renewals.MemberID', '=', 'members.MemberID')
                ->whereDate('RenewalDate', $today);
        
            if ($branch !== 'all') {
                $renewalBreakdownQuery->where('members.StartedBranchID', $branch);
            }
        
            $renewalBreakdown = $renewalBreakdownQuery
                ->groupBy('membership_plans.Price')
                ->get()
                ->mapWithKeys(function ($item) {
                    return [(string)$item->Price => $item->count];
                })
                ->toArray();
        
            // Get specific plan counts for commonly used ones
            $plan1599Count = $renewalBreakdown['1599.00'] ?? 0;
            $plan1799Count = $renewalBreakdown['1799.00'] ?? 0;
            $plan1999Count = $renewalBreakdown['1999.00'] ?? 0;
            
            // Calculate "others" count (total renewals minus the specific plans we track)
            $specificPlansCounted = $plan1599Count + $plan1799Count + $plan1999Count;
            $otherPlansCount = $renewalsToday - $specificPlansCounted;
        
            // 4) Detailed renewal info
            $renewalDetailsQuery = MembershipRenewal::select(
                    'membership_renewals.*',
                    'members.FullName',
                    'members.Email',
                    'members.Phone',
                    'membership_plans.PlanName',
                    'membership_plans.Price'
                )
                ->join('members', 'membership_renewals.MemberID', '=', 'members.MemberID')
                ->join('membership_plans', 'membership_renewals.PlanID', '=', 'membership_plans.PlanID')
                ->whereDate('RenewalDate', $today);
        
            if ($branch !== 'all') {
                $renewalDetailsQuery->where('members.StartedBranchID', $branch);
            }
        
            $renewalDetails = $renewalDetailsQuery
                ->get()
                ->groupBy(function($item) {
                    return (string)$item->Price;
                });
                
            // Also get all renewals in a flat array
            $allRenewals = $renewalDetailsQuery->get();
                
            // 5) Walk-ins today
            $walkInsQuery = WalkIn::query()->whereDate('VisitDate', $today);
            
            if ($branch !== 'all') {
                $walkInsQuery->where('walk_ins.BranchID', $branch);
            }
            
            $walkInsToday = $walkInsQuery->count();
            
            // Get detailed information about walk-ins
            $walkInDetails = $walkInsQuery
                ->select('walk_ins.*', 'branches.BranchName', 'payments.Amount')
                ->leftJoin('branches', 'walk_ins.BranchID', '=', 'branches.BranchID')
                ->leftJoin('payments', 'walk_ins.PaymentID', '=', 'payments.PaymentID')
                ->get();
                
            // 6) New sign-ups today
            $newSignUpsQuery = Member::query()->whereDate('members.created_at', $today);
            
            if ($branch !== 'all') {
                $newSignUpsQuery->where('StartedBranchID', $branch);
            }
            
            $newSignUpsToday = $newSignUpsQuery->count();
            
            // Get detailed information about new sign-ups
            $newSignUpDetails = $newSignUpsQuery
                ->select(
                    'members.MemberID',
                    'members.FullName',
                    'members.Email',
                    'members.Phone',
                    'members.MembershipStartDate',
                    'members.MembershipEndDate',
                    'membership_plans.PlanName',
                    'membership_plans.Price',
                    'branches.BranchName'
                )
                ->join('membership_plans', 'members.PlanID', '=', 'membership_plans.PlanID')
                ->join('branches', 'members.StartedBranchID', '=', 'branches.BranchID')
                ->get();
        
            // Log the results for debugging
            \Log::info('Member metrics results:', [
                'loginsToday' => $loginsToday,
                'renewalsToday' => $renewalsToday,
                'plan1599Count' => $plan1599Count,
                'plan1799Count' => $plan1799Count,
                'plan1999Count' => $plan1999Count,
                'otherPlansCount' => $otherPlansCount,
                'renewalDetailsCount' => count($renewalDetails),
                'walkInsToday' => $walkInsToday,
                'newSignUpsToday' => $newSignUpsToday,
                'branch' => $branch
            ]);
        
            return response()->json([
                'loginsToday'    => $loginsToday,
                'renewalsToday'  => $renewalsToday,
                'walkInsToday'   => $walkInsToday,
                'newSignUpsToday' => $newSignUpsToday,
                'renewalBreakdown' => [
                    'plan1599'   => $plan1599Count,
                    'plan1799'   => $plan1799Count,
                    'plan1999'   => $plan1999Count,
                    'otherPlans' => $otherPlansCount,
                ],
                'allPlanPrices' => array_keys($renewalBreakdown),
                'loggedInMembers' => $loggedInMembers,
                'renewalDetails' => $renewalDetails,
                'allRenewals' => $allRenewals,
                'walkInDetails' => $walkInDetails,
                'newSignUpDetails' => $newSignUpDetails,
            ]);
        } catch (\Exception $e) {
            \Log::error('Error in memberMetrics: ' . $e->getMessage(), [
                'exception' => $e,
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'error' => 'An error occurred while fetching member metrics',
                'message' => $e->getMessage()
            ], 500);
        }
    }
    
    
}
