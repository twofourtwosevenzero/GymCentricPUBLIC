<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\DailyCashFlow;
use App\Models\Expense;
use App\Models\Promotions;
use Illuminate\Support\Facades\DB;

class FinanceController extends Controller
{
    /* ------------------------------------------------------------------
     * DAILY CASH FLOW
     * ------------------------------------------------------------------ */

    public function createCashFlow()
    {
        return response()->json([
            'message' => 'Endpoint for creating a new cash flow record. Provide branch list here if needed.'
        ]);
    }

    public function generateDailyCashFlow(Request $request)
    {
        $request->validate([
            'date'              => 'required|date',
            'branch_id'         => 'required|exists:branches,BranchID',
            'PettyCashTomorrow' => 'nullable|numeric|min:0'
        ]);
    
        $date     = $request->input('date');
        $branchId = $request->input('branch_id');
        $inputPettyCashTomorrow = $request->input('petty_cash_tomorrow') ?? 0;
    
        // Look up yesterday's cash flow for this branch and Gym business.
        $yesterday = \Carbon\Carbon::parse($date)->subDay()->format('Y-m-d');
        $yesterdayFlow = DailyCashFlow::where('BranchID', $branchId)
                            ->whereDate('Date', $yesterday)
                            ->where('BusinessType', 'Gym')
                            ->first();
        // If yesterday had a PettyCashTomorrow value, that becomes today's petty cash.
        $pettyCashToday = $yesterdayFlow ? $yesterdayFlow->PettyCashTomorrow : 0;
    
        $dailyFlow = DailyCashFlow::firstOrCreate(
            [
                'Date'         => $date,
                'BranchID'     => $branchId,
                'BusinessType' => 'Gym',
            ],
            [
                'CashSales'        => 0,
                'GCashSales'       => 0,
                'BPISales'         => 0,
                'BDOSales'         => 0,
                // Set PettyCash from yesterday's PettyCashTomorrow
                'PettyCash'        => $pettyCashToday,
                'DepositedAmount'  => 0,
                'TotalSales'       => 0,
                'PettyCashTomorrow'=> 0,  // will be updated below
            ]
        );
    
        // Sum membership payments for this date/branch
        $payments = \App\Models\Payment::whereDate('PaymentDate', $date)
                    ->where('BranchID', $branchId)
                    ->get();
    
        // Group payments by payment method and normalize the method names
        $sumCash = $payments->filter(function($payment) {
            $method = strtolower($payment->PaymentMethod);
            return strpos($method, 'cash') !== false && strpos($method, 'gcash') === false;
        })->sum('Amount');
        
        $sumGCash = $payments->filter(function($payment) {
            return strpos(strtolower($payment->PaymentMethod), 'gcash') !== false;
        })->sum('Amount');
        
        $sumBPI = $payments->filter(function($payment) {
            return strpos(strtolower($payment->PaymentMethod), 'bpi') !== false;
        })->sum('Amount');
        
        $sumBDO = $payments->filter(function($payment) {
            return strpos(strtolower($payment->PaymentMethod), 'bdo') !== false;
        })->sum('Amount');
    
        $dailyFlow->CashSales  = $sumCash;
        $dailyFlow->GCashSales = $sumGCash;
        $dailyFlow->BPISales   = $sumBPI;
        $dailyFlow->BDOSales   = $sumBDO;
    
        // Compute TotalSales
        $dailyFlow->TotalSales =
            ($dailyFlow->CashSales ?? 0) +
            ($dailyFlow->GCashSales ?? 0) +
            ($dailyFlow->BPISales ?? 0) +
            ($dailyFlow->BDOSales ?? 0);
    
        // Update today's record with the new petty cash for tomorrow input.
        $dailyFlow->PettyCashTomorrow = $inputPettyCashTomorrow;
        $dailyFlow->save();
    
        return response()->json([
            'success' => true,
            'message' => 'Daily cash flow (Gym) generated/updated successfully.',
            'data'    => $dailyFlow,
        ], 200);
    }
    
    
    public function storeCashFlow(Request $request)
    {
        $staff = auth('staff')->user();
    
        // 1) Validate
        //    If you have no scenario where BranchID can be null, remove the "Overall" logic entirely:
        $data = $request->validate([
            'BranchID'         => 'required|exists:branches,BranchID',
            'Date'             => 'required|date',
            'BusinessType'     => 'required|string|max:100',
            'CashSales'        => 'nullable|numeric|min:0',
            'GCashSales'       => 'nullable|numeric|min:0',
            'BPISales'         => 'nullable|numeric|min:0',
            'BDOSales'         => 'nullable|numeric|min:0',
            'PettyCash'        => 'nullable|numeric|min:0',
            'PettyCashTomorrow'=> 'nullable|numeric|min:0',
            'DepositedAmount'  => 'nullable|numeric|min:0',
            'Remarks'          => 'nullable|string',
        ]);
        
    
        // If you still want "Overall" to have null BranchID, handle it here:
        // (Remove if you are no longer using Overall lumpsum)
        if ($data['BusinessType'] === 'Overall') {
            $data['BranchID'] = null;
        }
    
        // 2) Staff check
        if ($staff && !empty($data['BranchID'])) {
            $staffBranchIDs = $staff->branches->pluck('BranchID')->toArray();
            if (!in_array($data['BranchID'], $staffBranchIDs)) {
                return response()->json([
                    'error' => 'You cannot create a Cash Flow for a branch you are not assigned to.'
                ], 403);
            }
        }
    
        // 3) Compute total from sales columns
        $total = 0;
        $total += $data['CashSales']        ?? 0;
        $total += $data['GCashSales']       ?? 0;
        $total += $data['BPISales']         ?? 0;
        $total += $data['BDOSales']         ?? 0;
    
        $data['TotalSales'] = $total;
    
        // 4) Upsert: check if row already exists for [Date + BranchID + BusinessType]
        $existingQuery = DailyCashFlow::where('BusinessType', $data['BusinessType'])
            ->whereDate('Date', $data['Date']);
    
        if ($data['BusinessType'] !== 'Overall') {
            $existingQuery->where('BranchID', $data['BranchID']);
        } else {
            $existingQuery->whereNull('BranchID');
        }
    
        $existing = $existingQuery->first();
    
        if ($existing) {
            // We have a record -> update/merge
            $existing->CashSales        += $data['CashSales']        ?? 0;
            $existing->GCashSales       += $data['GCashSales']       ?? 0;
            $existing->BPISales         += $data['BPISales']         ?? 0;
            $existing->BDOSales         += $data['BDOSales']         ?? 0;
    
            // *** Now we let every business have petty & deposit
            // If you want to ADD to petty, do +=. If you want to OVERWRITE, do =.
            $existing->PettyCash       += $data['PettyCash']       ?? 0;
            $existing->DepositedAmount += $data['DepositedAmount'] ?? 0;
    
            // Recompute total
            $existing->TotalSales = (
                $existing->CashSales + $existing->GCashSales + 
                $existing->BPISales + $existing->BDOSales
            );
    
            // Append remarks if provided
            if (!empty($data['Remarks'])) {
                $existing->Remarks = trim($existing->Remarks . "\n" . $data['Remarks']);
            }
    
            $existing->save();
            return response()->json([
                'message' => 'Cash Flow updated for ' . $data['Date'] . ' - ' . $data['BusinessType'],
                'cashflow' => $existing
            ], 200);
        }
    
        // 5) Create new if none exists.
        $cashFlow = DailyCashFlow::create($data);
        return response()->json([
            'message' => 'Cash Flow created for ' . $data['Date'] . ' - ' . $data['BusinessType'],
            'cashflow' => $cashFlow
        ], 201);
    }
    
    public function indexCashFlow()
    {
        $staff = auth('staff')->user();
        $admin = auth('admin')->user();
        $owner = auth('owner')->user();
    
        if ($staff) {
            $staffBranchIDs = $staff->branches->pluck('BranchID')->toArray();
    
            // 1) Remove the ->select(...) so staff sees *all columns*
            $flows = DailyCashFlow::whereIn('BranchID', $staffBranchIDs)
                ->orderBy('Date', 'desc')
                ->get();
    
        } elseif ($admin || $owner) {
            // 2) Same here — just get everything
            $flows = DailyCashFlow::orderBy('Date', 'desc')->get();
        } else {
            $flows = collect([]);
        }
    
        return response()->json(['flows' => $flows]);
    }
    
    public function updateCashFlow(Request $request, $id)
    {
        $data = $request->validate([
            'BranchID'         => 'required|exists:branches,BranchID',
            'Date'             => 'required|date',
            'BusinessType'     => 'required|string|max:100',
            'CashSales'        => 'nullable|numeric|min:0',
            'GCashSales'       => 'nullable|numeric|min:0',
            'BPISales'         => 'nullable|numeric|min:0',
            'BDOSales'         => 'nullable|numeric|min:0',
            'WalkInCashSales'  => 'nullable|numeric|min:0',
            'WalkInGCashSales' => 'nullable|numeric|min:0',
            'WalkInBPISales'   => 'nullable|numeric|min:0',
            'WalkInBDOSales'   => 'nullable|numeric|min:0',
            'PettyCash'        => 'nullable|numeric|min:0',
            'PettyCashTomorrow'=> 'nullable|numeric|min:0',
            'DepositedAmount'  => 'nullable|numeric|min:0',
            'Remarks'          => 'nullable|string',
        ]);
        

        $cashflow = DailyCashFlow::findOrFail($id);
        $cashflow->update($data);

        return response()->json([
            'success' => true,
            'message' => 'Cash flow updated successfully.',
            'data'    => $cashflow,
        ], 200);
    }

    public function destroyCashFlow($id)
    {
        $cashflow = DailyCashFlow::findOrFail($id);
        $cashflow->delete();

        return response()->json([
            'success' => true,
            'message' => 'Cash flow deleted successfully.',
        ], 200);
    }

    /* ------------------------------------------------------------------
     * EXPENSES
     * ------------------------------------------------------------------ */

    public function createExpense()
    {
        return response()->json([
            'message' => 'Endpoint for creating a new expense.'
        ]);
    }

    public function storeExpense(Request $request)
    {
        $staff = auth('staff')->user();
    
        $data = $request->validate([
            'BranchID'        => 'required|exists:branches,BranchID',
            'ExpenseDate'     => 'required|date',
            'ExpenseCategory' => 'required|string|max:100',
            'Amount'          => 'required|numeric|min:0',
            'PaymentMethod'   => 'nullable|string|max:50',
            'StaffID'         => 'nullable|exists:staff,StaffID',
            'Notes'           => 'nullable|string',
    
            // NEW validation for BusinessType
            'BusinessType'    => 'required|string|max:50', 
            // optionally -> 'in:Gym,Cafe,Yogurt,"Yogurt Cafe"' if you want to enforce choices
        ]);
    
        if ($staff) {
            $staffBranchIDs = $staff->branches->pluck('BranchID')->toArray();
            if (!in_array($data['BranchID'], $staffBranchIDs)) {
                return response()->json([
                    'error' => 'You cannot create an Expense for a branch you are not assigned to.'
                ], 403);
            }
        }
    
        $expense = Expense::create($data);
    
        return response()->json([
            'success' => true,
            'message' => 'Expense created successfully.',
            'data'    => $expense
        ], 201);
    }

    public function indexExpenses()
    {
        $staff = auth('staff')->user();
        $admin = auth('admin')->user();
        $owner = auth('owner')->user();
    
        if ($staff) {
            $staffBranchIDs = $staff->branches->pluck('BranchID')->toArray();
            $expenses = Expense::with('staff')
                ->select('ExpenseID', 'ExpenseDate', 'ExpenseCategory',
                         'Amount', 'Notes', 'StaffID', 'BranchID',
                         'BusinessType' // <--- Include this so it shows in JSON
                )
                ->whereIn('BranchID', $staffBranchIDs)
                ->orderBy('ExpenseDate', 'desc')
                ->get();
        } elseif ($admin || $owner) {
            $expenses = Expense::with('staff')
                ->orderBy('ExpenseDate', 'desc')
                ->get(); 
                // returns all columns, including BusinessType if you haven't hidden it
        } else {
            $expenses = collect([]);
        }
    
        return response()->json(['expenses' => $expenses]);
    }
    
    public function updateExpense(Request $request, $id)
    {
        $staff   = auth('staff')->user();
        $expense = Expense::findOrFail($id);
    
        $data = $request->validate([
            'BranchID'        => 'required|exists:branches,BranchID',
            'ExpenseDate'     => 'required|date',
            'ExpenseCategory' => 'required|string|max:100',
            'Amount'          => 'required|numeric|min:0',
            'PaymentMethod'   => 'nullable|string|max:50',
            'StaffID'         => 'nullable|exists:staff,StaffID',
            'Notes'           => 'nullable|string',
            
            // NEW
            'BusinessType'    => 'required|string|max:50',
        ]);
    
        if ($staff) {
            $staffBranchIDs = $staff->branches->pluck('BranchID')->toArray();
            if (!in_array($expense->BranchID, $staffBranchIDs)) {
                return response()->json([
                    'error' => 'Cannot update expense from a branch you are not assigned to.'
                ], 403);
            }
            if (!in_array($data['BranchID'], $staffBranchIDs)) {
                return response()->json([
                    'error' => 'Cannot change expense to a branch you are not assigned to.'
                ], 403);
            }
        }
    
        $expense->update($data);
    
        return response()->json([
            'success' => true,
            'message' => 'Expense updated successfully.',
            'data'    => $expense
        ]);
    }
    
    public function destroyExpense($id)
    {
        $staff = auth('staff')->user();
        $expense = Expense::findOrFail($id);

        if ($staff) {
            $staffBranchIDs = $staff->branches->pluck('BranchID')->toArray();
            if (!in_array($expense->BranchID, $staffBranchIDs)) {
                return response()->json([
                    'error' => 'Cannot delete an expense from a branch you are not assigned to.'
                ], 403);
            }
        }

        $expense->delete();

        return response()->json([
            'success' => true,
            'message' => 'Expense deleted successfully.'
        ]);
    }

    /* ------------------------------------------------------------------
     * PROMOTIONS
     * ------------------------------------------------------------------ */

    public function indexPromotions(Request $request)
    {
        $promos = Promotions::orderBy('Name', 'asc')->get();

        return response()->json([
            'promos' => $promos
        ]);
    }

    public function storePromotion(Request $request)
    {
        $data = $request->validate([
            'PromotionID'        => 'nullable|exists:promotions,PromotionID',
            'Name'               => 'required|string|max:255',
            'DiscountType'       => 'required|string|max:50',
            'DiscountValue'      => 'required|numeric|min:0',
            'StartDate'          => 'required|date',
            'EndDate'            => 'nullable|date|after_or_equal:StartDate',
            'TermsAndConditions' => 'nullable|string',
            'Status'             => 'nullable|string|max:50',
        ]);

        if (!empty($data['PromotionID'])) {
            $promo = Promotions::findOrFail($data['PromotionID']);
            $promo->update($data);
        } else {
            $promo = Promotions::create($data);
        }

        return response()->json([
            'success' => true,
            'message' => 'Promotion saved successfully.',
            'data'    => $promo
        ]);
    }

    public function togglePromotion($id)
    {
        $promo = Promotions::findOrFail($id);

        if ($promo->Status === 'Active') {
            $promo->update(['Status' => 'Inactive']);
        } else {
            $promo->update(['Status' => 'Active']);
        }

        return response()->json([
            'success' => true,
            'message' => 'Promotion status toggled.',
            'data'    => $promo
        ]);
    }

    /**
     * Return financial summary (total revenue, net profit).
     */
    public function getFinancialSummary()
    {
        $staff = auth('staff')->user();

        $cashFlowQuery = DailyCashFlow::query();
        $expenseQuery = Expense::query();

        if ($staff) {
            $branchIds = $staff->branches->pluck('BranchID')->toArray();
            $cashFlowQuery->whereIn('BranchID', $branchIds);
            $expenseQuery->whereIn('BranchID', $branchIds);
        }

        $totalRevenue = $cashFlowQuery->sum('TotalSales');
        $totalExpenses = $expenseQuery->sum('Amount');
        $netProfit = $totalRevenue - $totalExpenses;

        return response()->json([
            'total_revenue' => $totalRevenue,
            'net_profit'    => $netProfit
        ]);
    }

    /**
     * NEW: Overview KPIs endpoint that aggregates multiple KPI values.
     * These values will populate the front-end overview cards.
     */
    public function getOverviewKPIs()
    {
        $staff = auth('staff')->user();

        // Financial summary
        $cashFlowQuery = DailyCashFlow::query();
        $expenseQuery = Expense::query();
        if ($staff) {
            $branchIds = $staff->branches->pluck('BranchID')->toArray();
            $cashFlowQuery->whereIn('BranchID', $branchIds);
            $expenseQuery->whereIn('BranchID', $branchIds);
        }
        $totalRevenue = $cashFlowQuery->sum('TotalSales');
        $totalExpenses = $expenseQuery->sum('Amount');
        $netProfit = $totalRevenue - $totalExpenses;

        // New Members This Month
        $currentMonth = date('M Y');
        $newMembersThisMonth = DB::table('members')
            ->whereNotNull('MembershipStartDate')
            ->whereRaw("DATE_FORMAT(MembershipStartDate, '%b %Y') = ?", [$currentMonth])
            ->count();

        // Attendance Rate: average weekly attendance based on 'attendances' table
        $weeklyAttendance = DB::table('attendances')
            ->select(
                DB::raw("YEAR(Date) as year"),
                DB::raw("WEEK(Date, 1) as week"),
                DB::raw("COUNT(*) as totalAttendance")
            )
            ->groupBy('year', 'week')
            ->get();
        $sumAttendance = $weeklyAttendance->sum('totalAttendance');
        $numWeeks = $weeklyAttendance->count();
        $avgAttendance = $numWeeks > 0 ? $sumAttendance / $numWeeks : 0;
        // Assuming a weekly target of 100 attendances
        $attendanceRatePercent = $avgAttendance > 0 ? min(round(($avgAttendance / 100) * 100), 100) : 0;
        $attendanceRate = $attendanceRatePercent . "%";

        // Most Popular Service: determine the facility with the highest number of bookings this month
        $popularBooking = DB::table('bookings')
            ->select('FacilityID', DB::raw("COUNT(*) as count"))
            ->whereYear('BookingDate', date('Y'))
            ->whereMonth('BookingDate', date('m'))
            ->groupBy('FacilityID')
            ->orderByDesc('count')
            ->first();
        $mostPopularService = "N/A";
        if ($popularBooking) {
            $facility = DB::table('facilities')
                ->where('FacilityID', $popularBooking->FacilityID)
                ->first();
                if ($facility) {
                    $mostPopularService = $facility->FacilityName; 
                }
                
        }

        return response()->json([
            'total_revenue'          => $totalRevenue,
            'net_profit'             => $netProfit,
            'new_members_this_month' => $newMembersThisMonth,
            'attendance_rate'        => $attendanceRate,
            'most_popular_service'   => $mostPopularService,
        ]);
    }

    /**
     * Alias for front-end compatibility.
     * GET /finance/summary will now call this method.
     */
    public function indexSummary()
    {
        return $this->getOverviewKPIs();
    }
}
