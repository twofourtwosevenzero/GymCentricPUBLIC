<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Payment;
use App\Models\Member;
use App\Models\Expense; // Make sure the model exists

class AdminDashboardController extends Controller
{
    /**
     * Render the Admin Dashboard layout.
     */
    public function index()
    {
        $dashboardData = [
            'title' => 'Admin Dashboard',
            'info'  => 'Dashboard data for Admin users.',
        ];

        return inertia('Admin/DashboardLayoutWrapper', $dashboardData);
    }

    /**
     * Return key metrics and notifications for the Admin dashboard.
     *
     * Query parameters:
     * - period (daily, weekly, monthly, yearly)
     * - dateFrom (YYYY-MM-DD)
     * - dateTo (YYYY-MM-DD)
     * - branch (branch ID or 'all')
     */
    public function metrics(Request $request)
    {
        // Match how the OwnerDashboard logic fetches data
        $period   = $request->query('period', 'monthly');
        $dateFrom = $request->query('dateFrom');
        $dateTo   = $request->query('dateTo');
        $branch   = $request->query('branch', 'all');

        // 1) Build query for Completed payments => totalRevenue
        $paymentsQuery = Payment::where('Status', 'Completed');
        if ($branch !== 'all') {
            $paymentsQuery->where('BranchID', $branch);
        }
        if ($dateFrom) {
            $paymentsQuery->whereDate('PaymentDate', '>=', $dateFrom);
        }
        if ($dateTo) {
            $paymentsQuery->whereDate('PaymentDate', '<=', $dateTo);
        }
        $totalRevenue = $paymentsQuery->sum('Amount');

        // 2) Build query for expenses => totalExpenses
        $expensesQuery = Expense::query();
        if ($branch !== 'all') {
            $expensesQuery->where('BranchID', $branch);
        }
        if ($dateFrom) {
            $expensesQuery->whereDate('ExpenseDate', '>=', $dateFrom);
        }
        if ($dateTo) {
            $expensesQuery->whereDate('ExpenseDate', '<=', $dateTo);
        }
        $totalExpenses = $expensesQuery->sum('Amount');

        // 3) Use Member count for totalEmailsSent and totalClients
        $totalEmailsSent = Member::count();
        $totalClients    = Member::count();

        // 4) Dummy traffic value (replace with real logic if needed)
        $trafficReceived = 800;

        // 5) Dummy notifications (replace with real data if available)
        $notifications = [
            ['message' => 'Admin: New payment received TXN123'],
            ['message' => 'Admin: Expense record updated.'],
            ['message' => 'Admin: New member registered.'],
        ];

        // Return response in JSON form
        return response()->json([
            'metrics' => [
                'totalRevenue'    => $totalRevenue,
                'totalExpenses'   => $totalExpenses,    // <--- so you can show expense in the UI
                'totalEmailsSent' => $totalEmailsSent,
                'totalClients'    => $totalClients,
                'trafficReceived' => $trafficReceived,
            ],
            'notifications' => $notifications,
        ]);
    }

    // Other admin endpoints if needed:
    public function users()
    {
        return response()->json(['message' => 'Admin: list of users']);
    }

    public function payments()
    {
        return response()->json(['message' => 'Admin: payments overview']);
    }

    public function systemLogs()
    {
        return response()->json(['message' => 'Admin: system logs']);
    }

    public function notifications()
    {
        return response()->json(['message' => 'Admin: notifications']);
    }

    public function settings()
    {
        return response()->json(['message' => 'Admin: settings']);
    }
}
