<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\Member;
use App\Models\MembershipPlan;
use App\Models\MembershipRenewal;
use App\Models\MembershipFreeze;
use App\Models\Invoice;
use App\Models\InvoiceLineItem;
use App\Models\PaymentInvoice;
use App\Models\WalkIn;
use App\Models\Payment;
use App\Models\SystemLog;
use Carbon\Carbon;
use Illuminate\Validation\Rule;



class MembershipController extends Controller
{
    /* ------------------------------------------------------------------
     * 1) MEMBERS
     * ------------------------------------------------------------------ */

    /**
     * Return JSON with members (and optionally walkIns, renewals, etc.).
     * GET /membership/members
     */
    public function apiIndex()
    {
        // List all relationships you want to eager-load
        $relations = [
            'startedBranch',
            'plan',
            'renewals',
            'freezes',
            'changeLogs',
            'payments',
            'bookings',
            'notifications',
            'lockerUsages',
            'sessionBookings',
            'sessionAttendances',
            'sessionWaitlists',
            'visits',
            'status',
        ];
    
        // Regardless of the logged-in user, fetch all members along with the defined relationships
        $members  = Member::with($relations)
                    ->orderBy('MemberID', 'desc')
                    ->get();
    
        $freezes  = MembershipFreeze::orderBy('FreezeID', 'desc')->get();
        $renewals = MembershipRenewal::orderBy('RenewalID', 'desc')->get();
        $walkIns  = WalkIn::orderBy('WalkInID', 'desc')->get();
    
        return response()->json([
            'members'  => $members,
            'walkIns'  => $walkIns,
            'renewals' => $renewals,
            'freezes'  => $freezes,
        ]);
    }
    

    /**
     * Simple search by name (GET /membership/search-members?q=)
     */
    public function apiSearchMembers(Request $request)
    {
        $q = $request->query('q', '');
        $members = Member::where('FullName', 'like', $q . '%')
                    ->orderBy('FullName')
                    ->limit(30)
                    ->get(['MemberID','FullName']);
        
        return response()->json($members);
    }

    /**
     * Create a new member (POST /membership/members).
     */

     public function apiStoreMember(Request $request)
     {
        // Set PHP timezone explicitly for this request
        date_default_timezone_set('Asia/Manila');

        if ($request->has('Payments')) {
            $request->merge([
                'Payments' => json_decode($request->input('Payments'), true),
            ]);
        }

         $data = $request->validate([
             'BranchID'             => 'nullable|exists:branches,BranchID',
             'FullName'             => 'required|string|max:255',
             'Email'                => 'required|email|unique:members,Email',
             'Phone'                => 'nullable|string|max:50',
             'PlanID'               => 'nullable|exists:membership_plans,PlanID',
             'MembershipCardNumber' => 'nullable|unique:members,MembershipCardNumber',
             'MembershipCardIssued' => 'boolean',
             'MemberStatusID'       => 'nullable|exists:member_statuses,MemberStatusID',
             'MembershipStartDate'  => 'nullable|date',
             'Biometrics'           => 'nullable|string',
             'FreeSessions'         => 'nullable|integer',
             'Notes'                => 'nullable|string',
             
             'PhotoFile'            => 'nullable|image|mimes:jpg,png,jpeg,gif|max:2048',
     
             // Payment & multi-month
             'Payments'                      => 'array', // array of partial payments
             'Payments.*.PaymentMethod'      => 'string|max:50',
             'Payments.*.PaymentAmount'      => 'numeric|min:0',
             'MonthsToPayUpfront'           => 'nullable|integer|min:1', // e.g. 3 or 6
         ]);
     
            $data['StartedBranchID'] = $data['BranchID'] ?? null;
        
         
         // Handle photo upload
         if ($request->hasFile('PhotoFile')) {
             $filename = 'member_' . time() . '.' . $request->file('PhotoFile')->extension();
             $photoPath = $request->file('PhotoFile')->storeAs('member_photos', $filename, 'public');
             $data['PhotoPath'] = $photoPath;
         }
     
         // Default to "NEW MEMBER" (ID=6) if no status given
         $data['MemberStatusID'] = 1;
     
         DB::beginTransaction();
         try {
             // 1) Create the Member
             $member = Member::create($data);
     
             // 2) If a Plan is selected => create membership invoice
             $monthsUpfront = $data['MonthsToPayUpfront'] ?? 1;
             $invoice = null; // We'll store the newly created invoice here if it applies
     
             if (!empty($data['PlanID'])) {
                 $plan = MembershipPlan::find($data['PlanID']);
                 if ($plan) {
                     // If no start date, default to today
                     $startDate = !empty($data['MembershipStartDate'])
                         ? Carbon::parse($data['MembershipStartDate'])->timezone('Asia/Manila')->startOfDay()
                         : Carbon::today()->timezone('Asia/Manila');
     
                     $member->MembershipStartDate = $startDate->format('Y-m-d');

                     $lockedInEndDate = $startDate->copy();
                    for ($i = 1; $i <= $plan->LockInMonths; $i++) {
                        $lockedInEndDate = $this->calculateNextMonthBillingDay($lockedInEndDate);
                    }
                    $member->LockedInEndDate = $lockedInEndDate->format('Y-m-d');


     
                     if ($monthsUpfront > 1) {
                         // MULTI-MONTH: create one invoice for all months
                         $nextCycleDate = $startDate->copy();
                         for ($i = 1; $i <= $monthsUpfront; $i++) {
                             $nextCycleDate = $this->calculateNextMonthBillingDay($nextCycleDate);
                         }
                         $member->MembershipEndDate = $nextCycleDate->format('Y-m-d');
                         $member->save();
     
                         // Create single invoice for the entire multi-month charge
                         $invoice = Invoice::create([
                             'BranchID'     => $member->StartedBranchID,
                             'MemberID'     => $member->MemberID,
                             'InvoiceDate'  => now()->timezone('Asia/Manila'),
                             'DueDate'      => now()->timezone('Asia/Manila'), // or pick a date
                             'InvoiceTotal' => 0,
                         ]);
                         $lineSubtotal = $plan->Price * $monthsUpfront;
                         InvoiceLineItem::create([
                             'InvoiceID'   => $invoice->InvoiceID,
                             'ItemType'    => 'Membership',
                             'ItemID'      => $plan->PlanID,
                             'Description' => "Prepaid for {$monthsUpfront} months",
                             'Quantity'    => $monthsUpfront,
                             'UnitPrice'   => $plan->Price,
                             'Subtotal'    => $lineSubtotal,
                         ]);
                         $invoice->InvoiceTotal = $lineSubtotal;
                         $invoice->save();
     
                     } else {
                         // SINGLE-MONTH SCENARIO
                         $endDate = $this->calculateNextMonthBillingDay($startDate);
                         $member->MembershipEndDate = $endDate->format('Y-m-d');
                         $member->save();
     
                         $invoice = Invoice::create([
                             'BranchID'     => $member->StartedBranchID,
                             'MemberID'     => $member->MemberID,
                             'InvoiceDate'  => now()->timezone('Asia/Manila'),
                             'DueDate'      => $endDate,  // or now() if you want immediate
                             'InvoiceTotal' => 0,
                         ]);
                         InvoiceLineItem::create([
                             'InvoiceID'   => $invoice->InvoiceID,
                             'ItemType'    => 'Membership',
                             'ItemID'      => $plan->PlanID,
                             'Description' => 'Monthly Membership',
                             'Quantity'    => 1,
                             'UnitPrice'   => $plan->Price,
                             'Subtotal'    => $plan->Price,
                         ]);
                         $invoice->InvoiceTotal = $plan->Price;
                         $invoice->save();
                     }
                 }
             } else {
                 // Even if no plan is selected, we should still set end date properly if start date is provided
                 if (!empty($data['MembershipStartDate'])) {
                     $startDate = Carbon::parse($data['MembershipStartDate'])->timezone('Asia/Manila')->startOfDay();
                     $endDate = $this->calculateNextMonthBillingDay($startDate);
                     $member->MembershipEndDate = $endDate->format('Y-m-d');
                     $member->save();
                 }
             }
     
             // 3) Process payments array (split payments)
             $paymentsData = $data['Payments'] ?? [];
             $allocatedSoFar = 0;
             $invoiceTotal = $invoice ? $invoice->InvoiceTotal : 0;
     
             foreach ($paymentsData as $payItem) {
                 // Create Payment record
                 $payment = Payment::create([
                     'MemberID'      => $member->MemberID,
                     'BranchID'      => $member->StartedBranchID,
                     'PaymentMethod' => $payItem['PaymentMethod'] ?? '',
                     'Amount'        => $payItem['PaymentAmount'] ?? 0,
                     'PaymentDate'   => now()->timezone('Asia/Manila'),
                     'PaymentFor'    => ['New Membership'],
                     'Status'        => 'Completed',
                 ]);
     
                 // If we have an invoice, allocate the payment
                 if ($invoice) {
                     $allocatedSoFar += $payItem['PaymentAmount'];
                     PaymentInvoice::create([
                         'PaymentID'       => $payment->PaymentID,
                         'InvoiceID'       => $invoice->InvoiceID,
                         'AmountAllocated' => $payItem['PaymentAmount'],
                     ]);
                 }
             }
     
             // 4) Generate QR code if requested
             if (!empty($request->input('GenerateQrCode')) && $request->input('GenerateQrCode') == 1) {
                 $validityDays = (int)$request->input('QrCodeValidityDays', 30);
                 
                 try {
                     // Generate the QR code
                     $qrCodeService = app(\App\Services\QrCodeService::class);
                     $qrCode = $qrCodeService->generateMemberQrCode($member, $validityDays);
                     
                     // Save it to the member record
                     $member->QrCodeData = $qrCode;
                     $member->QrCodeExpiry = now()->timezone('Asia/Manila')->addDays($validityDays);
                     $member->save();
                     
                     // Email it to the member if they have an email
                     if (!empty($member->Email)) {
                         // Use the QrCodeController to email the QR code
                         app(\App\Http\Controllers\QrCodeController::class)->emailQrCodeToMember(
                             $member->MemberID, 
                             new \Illuminate\Http\Request(['validity_days' => $validityDays])
                         );
                     }
                 } catch (\Exception $e) {
                     \Log::error('Error generating QR code for new member: ' . $e->getMessage());
                     // We don't want to fail the entire member creation if just the QR code fails
                     // so we'll continue without throwing an exception
                 }
             }
     
             // Update invoice PaymentStatus, if we have an invoice
             if ($invoice) {
                 if ($allocatedSoFar >= $invoiceTotal) {
                     $invoice->PaymentStatus = 'Paid';
                 } elseif ($allocatedSoFar > 0) {
                     $invoice->PaymentStatus = 'Partially Paid';
                 } else {
                     $invoice->PaymentStatus = 'Unpaid'; // or whatever you prefer
                 }
                 $invoice->save();
             }
     
             // 4) If they've paid at least 3 months and the invoice is fully paid => "ACTIVE"
             //
             // Otherwise, remain "NEW MEMBER" (ID=6).
             // So the logic is:
             //   - If monthsUpfront >= 3 (i.e. 3 or more months lock-in)
             //   - AND $invoice->PaymentStatus === 'Paid'
             // then MemberStatusID = 1.
             if ($invoice && $monthsUpfront >= 3 && $invoice->PaymentStatus === 'Paid') {
                 $member->MemberStatusID = 1; // 1 = ACTIVE
                 $member->save();
             }
     
             DB::commit();
     
             // Prepare response with additional information about QR code if it was generated
             $response = ['member' => $member];
     
             if (!empty($request->input('GenerateQrCode')) && $request->input('GenerateQrCode') == 1) {
                 $response['qrCodeGenerated'] = true;
                 $response['qrCodeEmailed'] = !empty($member->Email);
                 $response['qrCodeExpiresAt'] = $member->QrCodeExpiry ? $member->QrCodeExpiry->format('Y-m-d H:i:s') : null;
             }
     
             return response()->json($response, 201);
     
         } catch (\Exception $e) {
             DB::rollBack();
             return response()->json(['error' => $e->getMessage()], 500);
         }
     }
     
     /**
      * This helper function explicitly sets membership end date to the 15th or 30th 
      * of the next month, ensuring consistency across all scenarios.
      */
     private function calculateNextMonthBillingDay(Carbon $referenceDate, $months = 1)
     {
         // Set timezone to Asia/Manila and ensure we're working with start of day
         $referenceDate = $referenceDate->copy()->timezone('Asia/Manila')->startOfDay();
         
         // Start with first day of the next month to avoid day overflow issues
         $nextMonth = $referenceDate->copy()->startOfMonth()->addMonths($months);
         $daysInNextMonth = $nextMonth->daysInMonth;
         $dayOfMonth = (int) $referenceDate->format('d');
     
         // For days 1-15, set to 15th of next month
         if ($dayOfMonth <= 15) {
             // If next month has at least 15 days, use the 15th
             // Otherwise use the last day of the month (rare case)
             $candidateDay = ($daysInNextMonth >= 15) ? 15 : $daysInNextMonth;
         } 
         // For days 16-end of month, set to 30th of next month
         else {
             // If next month has at least 30 days, use the 30th
             // Otherwise use the last day of the month
             $candidateDay = ($daysInNextMonth >= 30) ? 30 : $daysInNextMonth;
         }
     
         // Create date with explicit year/month/day to avoid any inconsistencies
         // Set to midnight in Philippines timezone
         return Carbon::create($nextMonth->year, $nextMonth->month, $candidateDay, 0, 0, 0, 'Asia/Manila');
     }
     

    /**
     * Update an existing member (PUT /membership/members/{id}).
     */
    public function apiUpdateMember(Request $request, $id)
    {
        // Set PHP timezone explicitly for this request
        date_default_timezone_set('Asia/Manila');
        
        $member = Member::findOrFail($id);
    
        // For staff, ensure the member belongs to one of their branches.
        $staff = auth('staff')->user();
        if ($staff && !$staff->branches->pluck('BranchID')->contains($member->StartedBranchID)) {
            abort(403, 'Cannot update member from another branch.');
        }
    
        $data = $request->validate([
            'BranchID'             => 'nullable|exists:branches,BranchID',
            'FullName'             => 'nullable|string|max:255',
            'Email'                => [
                'required',
                'email',
                Rule::unique('members', 'Email')->ignore($member->MemberID, 'MemberID'),
            ],
            'Phone'                => 'nullable|string|max:50',
            'PlanID'               => 'nullable|exists:membership_plans,PlanID',
            'MembershipCardNumber' => 'nullable|unique:members,MembershipCardNumber,' . $member->MemberID . ',MemberID',
            'MembershipCardIssued' => 'boolean',
            'MemberStatusID'       => 'nullable|exists:member_statuses,MemberStatusID',
            'MembershipStartDate'  => 'nullable|date',
            'MembershipEndDate'    => 'nullable|date|after_or_equal:MembershipStartDate',
            'Biometrics'           => 'nullable|string',
            'FreeSessions'         => 'nullable|integer',
            'Notes'                => 'nullable|string',
            'PhotoFile'            => 'nullable|image|mimes:jpg,png,jpeg,gif|max:2048',
            'PaymentMethod'        => 'nullable|string|max:50',
            'PaymentAmount'        => 'nullable|numeric|min:0',
        ]);
    
        // For staff, do not allow changing to a branch not already assigned.
        if ($staff) {
            if (isset($data['BranchID']) && !$staff->branches->pluck('BranchID')->contains($data['BranchID'])) {
                abort(403, 'Staff cannot assign a different branch.');
            }
            // Ensure we keep the original branch.
            $data['StartedBranchID'] = $member->StartedBranchID;
        } else {
            $data['StartedBranchID'] = $data['BranchID'] ?? $member->StartedBranchID;
        }
    
        // Handle photo upload if provided.
        if ($request->hasFile('PhotoFile')) {
            $filename = 'member_' . time() . '.' . $request->file('PhotoFile')->extension();
            $photoPath = $request->file('PhotoFile')->storeAs('member_photos', $filename, 'public');
            $data['PhotoPath'] = $photoPath;
        }
        
        // Format membership start date consistently if provided
        if (isset($data['MembershipStartDate']) && !empty($data['MembershipStartDate'])) {
            $data['MembershipStartDate'] = Carbon::parse($data['MembershipStartDate'])
                ->timezone('Asia/Manila')
                ->startOfDay()
                ->format('Y-m-d');
        }
        
        // Format membership end date consistently if provided
        if (isset($data['MembershipEndDate']) && !empty($data['MembershipEndDate'])) {
            $data['MembershipEndDate'] = Carbon::parse($data['MembershipEndDate'])
                ->timezone('Asia/Manila')
                ->startOfDay()
                ->format('Y-m-d');
        }
    
        $member->update($data);
        return response()->json($member, 200);
    }
    

    /**
     * Delete a member (DELETE /membership/members/{id}).
     */
    public function apiDestroyMember($id)
    {
        $member = Member::findOrFail($id);

        // If staff => block cross-branch
        $staff = auth('staff')->user();
        if ($staff && $member->StartedBranchID != $staff->BranchID) {
            abort(403, 'Cannot delete member from another branch.');
        }

        $member->delete();
        return response()->json(['message' => 'Member deleted.'], 200);
    }

    /**
     * Just an example if you want membership statuses in the front-end
     */
    public function indexMemberStatuses()
    {
        $statuses = \App\Models\MemberStatus::orderBy('MemberStatusID')->get();
        return response()->json($statuses, 200);
    }

        /**
     * Return members whose membership ends within the next X days.
     * GET /membership/expiring?days=7
     */
    public function expiringMembers(Request $request)
    {
        // 1) Determine how many days in the future
        $days = (int) $request->query('days', 7);

        // 2) Calculate the date cutoff (today + X days)
        $today = Carbon::today();
        $cutoff = $today->copy()->addDays($days);

        // 3) Branch filtering if staff is logged in
        $staff = auth('staff')->user();
        if ($staff) {
            // If staff => filter for members in staff's branch(es)
            $branchIDs = $staff->branches->pluck('BranchID');
            $members = Member::whereIn('StartedBranchID', $branchIDs)
                ->whereNotNull('MembershipEndDate')
                ->whereDate('MembershipEndDate', '>=', $today)   // ends in the future (or today)
                ->whereDate('MembershipEndDate', '<=', $cutoff)  // ends on/before cutoff
                ->orderBy('MembershipEndDate', 'asc')
                ->get();
        } else {
            // Admin or Owner => no branch restriction
            $members = Member::whereNotNull('MembershipEndDate')
                ->whereDate('MembershipEndDate', '>=', $today)
                ->whereDate('MembershipEndDate', '<=', $cutoff)
                ->orderBy('MembershipEndDate', 'asc')
                ->get();
        }

        return response()->json($members);
    }


    /* ------------------------------------------------------------------
     * 2) MEMBERSHIP PLANS
     * ------------------------------------------------------------------ */

    /**
     * Return all membership plans as JSON.
     * GET /membership/plans
     */
    public function indexPlans()
    {
        // We join the "members" relationship, but we only need to select
        // minimal columns: MemberID, PlanID, StartedBranchID
        // so we can do branch-based filtering on the frontend
        $plans = MembershipPlan::with([
            'members' => function ($q) {
                // Only select the minimal fields
                $q->select('MemberID', 'PlanID', 'StartedBranchID');
            }
        ])
        ->orderBy('PlanID')
        ->get();
    
        return response()->json($plans, 200);
    }
    /**
     * Create a new plan.
     * POST /membership/plans
     */
    public function storePlan(Request $request)
    {
        $data = $request->validate([
            'PlanName' => 'required|string|max:255|unique:membership_plans,PlanName',
            'Price'    => 'required|numeric|min:0',
            'Duration' => 'required|integer|min:1',
            'Features' => 'nullable|string',
        ]);

        $plan = MembershipPlan::create($data);
        return response()->json($plan, 201);
    }

    /**
     * Update an existing plan.
     * PUT /membership/plans/{id}
     */
    public function updatePlan(Request $request, $id)
    {
        $plan = MembershipPlan::findOrFail($id);

        $data = $request->validate([
            'PlanName' => 'required|string|max:255|unique:membership_plans,PlanName,' . $plan->PlanID . ',PlanID',
            'Price'    => 'required|numeric|min:0',
            'Duration' => 'required|integer|min:1',
            'Features' => 'nullable|string',
        ]);

        $plan->update($data);
        return response()->json($plan, 200);
    }

    /**
     * Delete a plan.
     * DELETE /membership/plans/{id}
     */
    public function destroyPlan($id)
    {
        $plan = MembershipPlan::findOrFail($id);
        $plan->delete();
        return response()->json(['message' => 'Plan deleted'], 200);
    }

    /* ------------------------------------------------------------------
     * 3) MEMBERSHIP RENEWAL
     * ------------------------------------------------------------------ */

    // If you have more logic for Renewals, do similarly with JSON methods
    // For demonstration, we show a single store method:

    public function storeRenewal(Request $request)
    {
        // Set PHP timezone explicitly for this request
        date_default_timezone_set('Asia/Manila');
        
        $staff = auth('staff')->user();

        // 1) Validate incoming data
        $data = $request->validate([
            'MemberID'           => 'required|exists:members,MemberID',
            'RenewalStartDate'   => 'required|date',
            'NewEndDate'         => 'required|date|after_or_equal:RenewalStartDate',
            'RenewalAmount'      => 'required|numeric|min:0',
            'Payments'           => 'array',
            'Payments.*.PaymentMethod' => 'string|max:50',
            'Payments.*.PaymentAmount' => 'numeric|min:0',
            'PaymentFor'         => 'nullable|string',

            // NEW FIELD: which branch is performing the renewal
            'RenewalBranchID'    => 'nullable|exists:branches,BranchID',
        ]);

        // 2) Fetch the member
        $member = Member::findOrFail($data['MemberID']);

        // 3) Decide which branch to use for the invoice/payment
        //    - If the request included 'RenewalBranchID', we use that
        //    - Otherwise, you could use staff->branches->first() if staff has only one branch
        //    - Fallback: use the original $member->StartedBranchID if none provided
        $branchForRenewal = $request->input('RenewalBranchID') ?? $member->StartedBranchID;
        if (!empty($data['RenewalBranchID'])) {
            // If staff must only use a branch they belong to, check that here:
            if ($staff && !$staff->branches->pluck('BranchID')->contains($data['RenewalBranchID'])) {
                abort(403, 'Staff cannot assign a branch they do not belong to.');
            }
            $branchForRenewal = $data['RenewalBranchID'];
        } elseif ($staff && $staff->branches->count() === 1) {
            $branchForRenewal = $staff->branches->first()->BranchID;
        }

        // 4) Format and set the dates properly
        $renewalStart = Carbon::parse($data['RenewalStartDate'])
            ->timezone('Asia/Manila')
            ->startOfDay();
            
        // Use the manually entered end date from the form
        $newEndDate = Carbon::parse($data['NewEndDate'])
            ->timezone('Asia/Manila')
            ->startOfDay();
        
        // Update member's dates
        $member->MembershipStartDate = $renewalStart->format('Y-m-d');
        $member->MembershipEndDate = $newEndDate->format('Y-m-d');
        $member->save();

        // 5) Create a renewal record (still referencing the old plan, if any)
        $renewal = MembershipRenewal::create([
            'MemberID'         => $member->MemberID,
            'PlanID'           => $member->PlanID,      // keep existing plan
            'RenewalAmount'    => $data['RenewalAmount'],
            'RenewalDate'      => now()->timezone('Asia/Manila'),  // date of this renewal action
            'RenewalStartDate' => $data['RenewalStartDate'],
            'BranchID'         => $branchForRenewal, // new column
        ]);

        // 6) Create an invoice in the *renewal* branch, not the original StartedBranchID
        $invoice = Invoice::create([
            'BranchID'     => $branchForRenewal,
            'MemberID'     => $member->MemberID,
            'InvoiceDate'  => now()->timezone('Asia/Manila'),
            'DueDate'      => now()->timezone('Asia/Manila'),
            'InvoiceTotal' => $data['RenewalAmount'],
        ]);

        // 7) Attach a line item
        InvoiceLineItem::create([
            'InvoiceID'   => $invoice->InvoiceID,
            'ItemType'    => 'Renewal',
            'ItemID'      => $member->PlanID,  // or null
            'Description' => 'Manual Renewal',
            'Quantity'    => 1,
            'UnitPrice'   => $data['RenewalAmount'],
            'Subtotal'    => $data['RenewalAmount'],
        ]);

        // 8) Payment logic
        $paymentsData   = $data['Payments'] ?? [];
        $allocatedSoFar = 0;
        $payment        = null;

        foreach ($paymentsData as $payItem) {
            if (empty($payItem['PaymentMethod']) || empty($payItem['PaymentAmount'])) {
                continue;
            }

            $paymentFor = !empty($data['PaymentFor'])
                ? json_decode($data['PaymentFor'], true)
                : ["Membership Renewal"];

            // Create a Payment in the *renewal* branch
            $payment = Payment::create([
                'MemberID'      => $member->MemberID,
                'BranchID'      => $branchForRenewal,
                'PaymentMethod' => $payItem['PaymentMethod'],
                'Amount'        => $payItem['PaymentAmount'],
                'PaymentDate'   => now()->timezone('Asia/Manila'),
                'PaymentFor'    => $paymentFor,
                'Status'        => 'Completed',
            ]);

            // Link payment to invoice
            PaymentInvoice::create([
                'PaymentID'       => $payment->PaymentID,
                'InvoiceID'       => $invoice->InvoiceID,
                'AmountAllocated' => $payItem['PaymentAmount'],
            ]);

            $allocatedSoFar += $payItem['PaymentAmount'];
        }

        // 9) Update invoice payment status
        if ($allocatedSoFar >= $data['RenewalAmount']) {
            $invoice->update(['PaymentStatus' => 'Paid']);
        } elseif ($allocatedSoFar > 0) {
            $invoice->update(['PaymentStatus' => 'Partially Paid']);
        } else {
            $invoice->update(['PaymentStatus' => 'Unpaid']);
        }

        // 10) Decide if the member can become Active
        $monthsPaidSoFar = $this->calculateMonthsPaidSoFar($member);
        $today = Carbon::today()->timezone('Asia/Manila');
        $lockEnd = $member->LockedInEndDate ? Carbon::parse($member->LockedInEndDate)->timezone('Asia/Manila') : null;

        // For renewals, always set the member to Active regardless of previous status
        // The fact that they're renewing with a new end date is sufficient
        // to consider them Active, even if expired or beyond lock-in
        $member->MemberStatusID = 1; // Active

        // Optional: If you want to keep the previous logic for partial payments with no payment at all,
        // you could retain a check like this:
        // if ($invoice->PaymentStatus === 'Unpaid' && $allocatedSoFar <= 0) {
        //     $member->MemberStatusID = 6; // Pending
        // }
        
        $member->save();

        // 11) Return JSON
        return response()->json([
            'renewal' => $renewal,
            'invoice' => $invoice,
            'payment' => $payment,
            'member'  => $member,
            'message' => 'Membership renewed successfully with new end date: ' . $member->MembershipEndDate
        ], 201);
    }
    
    
    public function updateRenewal(Request $request, $id)
    {
        // Set PHP timezone explicitly for this request
        date_default_timezone_set('Asia/Manila');
        
        $data = $request->validate([
            'RenewalStartDate' => 'required|date',
            'NewEndDate'       => 'required|date|after_or_equal:RenewalStartDate',
            'RenewalAmount'    => 'required|numeric|min:0',
        ]);

        // Fetch the renewal record
        $renewal = MembershipRenewal::findOrFail($id);
        $member  = $renewal->member;

        // Format dates consistently
        $renewalStart = Carbon::parse($data['RenewalStartDate'])
            ->timezone('Asia/Manila')
            ->startOfDay();
            
        $newEndDate = Carbon::parse($data['NewEndDate'])
            ->timezone('Asia/Manila')
            ->startOfDay();

        // Update renewal row
        $renewal->RenewalStartDate = $renewalStart->format('Y-m-d');
        $renewal->RenewalAmount    = $data['RenewalAmount'];
        // If you want to update RenewalDate to "now" each edit, do so:
        $renewal->RenewalDate      = now()->timezone('Asia/Manila');
        $renewal->save();

        // Update the member's dates with the manually entered values
        $member->MembershipStartDate = $renewalStart->format('Y-m-d');
        $member->MembershipEndDate = $newEndDate->format('Y-m-d');
        
        // Always set the member to Active when updating a renewal
        $member->MemberStatusID = 1; // Active
        
        $member->save();

        return response()->json([
            'renewal' => $renewal,
            'member'  => $member,
            'message' => 'Renewal updated successfully with new end date: ' . $member->MembershipEndDate
        ], 200);
    }
     
    public function destroyRenewal($id)
    {
        $renewal = MembershipRenewal::findOrFail($id);
        $renewal->delete();
        return response()->json(['message' => 'Renewal deleted'], 200);
    }

/* ------------------------------------------------------------------
 * 4) MEMBERSHIP FREEZE
 * ------------------------------------------------------------------ */
public function storeFreeze(Request $request)
{
    $staff = auth('staff')->user();

    $data = $request->validate([
        'MemberID'        => 'required|exists:members,MemberID',
        'FreezeStartDate' => 'required|date',
        'FreezeEndDate'   => 'nullable|date|after_or_equal:FreezeStartDate',
        'Reason'          => 'nullable|string|max:255',
    ]);

    $member = Member::findOrFail($data['MemberID']);

    // Attach the member's branch to the freeze record.
    $data['StartedBranchID'] = $member->StartedBranchID;

    $freeze = MembershipFreeze::create($data);

    // Update the member's status to Frozen (assuming 2 = Frozen).
    $member->MemberStatusID = 2;
    $member->save();

    // Extend the MembershipEndDate by the freeze duration.
    $freezeStart = Carbon::parse($data['FreezeStartDate']);
    // If no end date provided, default to 30 days from start date
    $freezeEnd = $data['FreezeEndDate'] ? Carbon::parse($data['FreezeEndDate']) : $freezeStart->copy()->addDays(30);
    $freezeDays = $freezeStart->diffInDays($freezeEnd) + 1;

    if ($member->MembershipEndDate) {
        $currentEnd = Carbon::parse($member->MembershipEndDate);
        $newEnd = $currentEnd->addDays($freezeDays);
        $member->MembershipEndDate = $newEnd->format('Y-m-d');
        $member->save();
    }

    return response()->json([
        'freeze' => $freeze, 
        'member' => $member,
        'message' => "Membership frozen for {$freezeDays} days. End date extended accordingly."
    ], 201);
}

// 2) UPDATE an existing freeze
public function updateFreeze(Request $request, $id)
{
    $staff = auth('staff')->user();
    $freeze = MembershipFreeze::findOrFail($id);

    // Ensure the freeze's member belongs to one of the staff's branches.
    $member = $freeze->member;
    if ($staff && !$staff->branches->pluck('BranchID')->contains($member->StartedBranchID)) {
        abort(403, 'Not your branch.');
    }

    $data = $request->validate([
        'FreezeStartDate' => 'required|date',
        'FreezeEndDate'   => 'nullable|date|after_or_equal:FreezeStartDate',
        'Reason'          => 'nullable|string|max:255',
    ]);

    // Keep the original branch.
    $data['StartedBranchID'] = $freeze->StartedBranchID;

    $freeze->update($data);
    return response()->json($freeze, 200);
}


// 3) DELETE a freeze record and revert membership changes
public function destroyFreeze($id)
{
    $freeze = MembershipFreeze::findOrFail($id);
    $member = Member::findOrFail($freeze->MemberID);

    // Get the authenticated staff user.
    $staff = auth('staff')->user();

    // Use the staff's associated branch IDs for verification.
    if ($staff && !$staff->branches->pluck('BranchID')->contains($member->StartedBranchID)) {
        abort(403, 'Cannot remove freeze from another branch.');
    }

    // 1) Calculate freeze duration.
    $freezeStart = Carbon::parse($freeze->FreezeStartDate);
    $freezeEnd = $freeze->FreezeEndDate ? Carbon::parse($freeze->FreezeEndDate) : $freezeStart->copy()->addDays(30);
    $totalFreezeDays = $freezeStart->diffInDays($freezeEnd) + 1;

    $today = Carbon::today();
    $dateAdjustment = 0;

    // If the freeze hasn't started yet, remove the full extension
    if ($today->lt($freezeStart)) {
        $dateAdjustment = $totalFreezeDays;
    } 
    // If we're in the middle of the freeze period
    else if ($today->lte($freezeEnd)) {
        // Only remove the remaining days (days not yet used)
        $usedDays = $freezeStart->diffInDays($today);
        $remainingDays = $totalFreezeDays - $usedDays;
        $dateAdjustment = $remainingDays;
    }
    // If the freeze period is completely over, no adjustment needed
    else {
        $dateAdjustment = 0;
    }

    // 2) Adjust the membership end date
    if (!empty($member->MembershipEndDate) && $dateAdjustment > 0) {
        $currentEnd = Carbon::parse($member->MembershipEndDate);
        $newEnd = $currentEnd->subDays($dateAdjustment);
        $member->MembershipEndDate = $newEnd->format('Y-m-d');
    }

    // 3) Revert member status to Active (assuming '1' = Active).
    $member->MemberStatusID = 1;
    $member->save();

    // 4) Delete the freeze record.
    $freeze->delete();

    return response()->json([
        'message' => "Freeze canceled. Membership end date adjusted by {$dateAdjustment} days, status reverted to Active.",
        'member' => $member
    ], 200);
}

public function growth()
{
    $growthData = \DB::table('members')
        ->select(
            'StartedBranchID as BranchID',
            \DB::raw("DATE_FORMAT(MembershipStartDate, '%b %Y') as month"),
            \DB::raw("COUNT(*) as count")
        )
        ->whereNotNull('MembershipStartDate')
        ->groupBy('StartedBranchID', 'month')
        ->orderByRaw("MIN(MembershipStartDate)")
        ->get();

    return response()->json($growthData, 200);
}


public function getLatestCardNumber(Request $request)
{
    // Grab the branch ID from the query string
    $branchId = $request->query('branch');

    // Determine prefix "A" or "B" (or fallback)
    if ($branchId == 1) {
        $prefix = 'A';
    } elseif ($branchId == 2) {
        $prefix = 'B';
    } else {
        // fallback if you have more branches or an undefined branch
        $prefix = 'A';
    }

    // Search for the latest card that starts with e.g. "A-"
    $latestMember = Member::whereNotNull('MembershipCardNumber')
        ->where('MembershipCardNumber', 'LIKE', $prefix . '-%')
        ->orderByDesc('MemberID')
        ->first();

    // If none found, default to "A-0000" or "B-0000"
    if ($latestMember) {
        $latestCardNumber = $latestMember->MembershipCardNumber; // e.g. "A-0005"
    } else {
        $latestCardNumber = "{$prefix}-0000"; // "A-0000" if branch=1
    }

    return response()->json(['latestCardNumber' => $latestCardNumber]);
}


    /**
     * Calculate how many whole months the member has paid for so far
     * by comparing MembershipStartDate and MembershipEndDate.
     */
    private function calculateMonthsPaidSoFar(Member $member)
    {
        // If start/end dates are missing, return 0
        if (empty($member->MembershipStartDate) || empty($member->MembershipEndDate)) {
            return 0;
        }

        $start = \Carbon\Carbon::parse($member->MembershipStartDate);
        $end   = \Carbon\Carbon::parse($member->MembershipEndDate);

        // Use diffInMonths for whole months difference
        // e.g. if start=Mar 5, end=Jun 4 => 2 months
        //      if start=Mar 5, end=Jun 5 => 3 months
        // If you want partial months to count, you can use floatDiffInMonths()
        // and do floor/ceil. For example:
        //   $months = floor($start->floatDiffInMonths($end));
        $months = $start->diffInMonths($end);

        return $months;
    }

    
    // Helper for updating the membershipstatus of the member
    public function updateMembershipStatuses()
    {
        // Explicitly set today's date in Asia/Manila timezone
        $today = Carbon::today('Asia/Manila');
        
        // Get both active AND expired members to check retroactively
        $members = Member::whereIn('MemberStatusID', [1, 5]) // Active and Expired members
                         ->whereNotNull('MembershipEndDate')
                         ->get();
        
        $updatedCount = 0;
        $expiredCount = 0;
        $reactivatedCount = 0;
        $checkedCount = 0;

        foreach ($members as $member) {
            $checkedCount++;
            // Explicitly set the timezone for endDate and lockEnd to Asia/Manila
            $endDate = Carbon::parse($member->MembershipEndDate, 'Asia/Manila')->startOfDay();
            $lockEnd = $member->LockedInEndDate ? Carbon::parse($member->LockedInEndDate, 'Asia/Manila')->startOfDay() : null;
            
            $oldStatus = $member->MemberStatusID;
            
            // RETROACTIVE FIX: If a member is already expired but shouldn't be (end date is today or in the future)
            if ($oldStatus == 5 && $today->lte($endDate)) {
                // They were incorrectly marked as expired, reactivate them
                $member->MemberStatusID = 1; // Set back to ACTIVE
                $reactivatedCount++;
            }
            // STANDARD STATUS UPDATE LOGIC:
            else if ($oldStatus == 1) { // Only for active members
                // If no lock-in date or lock-in date is in the past
                if (!$lockEnd) {
                    // If today is AFTER end date (not on the same day), mark as expired
                    if ($today->gt($endDate)) {
                        $member->MemberStatusID = 5; // Expired
                        $expiredCount++;
                    }
                } else {
                    // Member has both end date and lock-in date
                    
                    // If today's date is strictly before the membership end date, keep as Active
                    if ($today->lt($endDate)) {
                        // Already active, no change needed
                    } 
                    // If today is the membership end date or before lock-in end, they're Pending
                    else if ($today->lte($lockEnd)) {
                        $member->MemberStatusID = 6; // Pending
                    }
                    // Both dates have passed:
                    else {
                        // Check if lock-in end date matches membership end date exactly
                        // This means they completed their lock-in exactly but didn't renew beyond it
                        if ($lockEnd->eq($endDate)) {
                            $member->MemberStatusID = 7; // INACTIVE
                        }
                        // If membership ended before lock-in ended, they're Pending (overdue)
                        else if ($endDate->lt($lockEnd)) {
                            $member->MemberStatusID = 6; // Pending (overdue)
                        } 
                        // If membership end date is past the lock-in end date and today is AFTER membership end date, they're Expired
                        else if ($today->gt($endDate)) {
                            $member->MemberStatusID = 5; // Expired
                            $expiredCount++;
                        }
                    }
                }
            }
            
            // Only save if status changed
            if ($oldStatus != $member->MemberStatusID) {
                $member->save();
                $updatedCount++;
            }
        }

        return response()->json([
            'message' => 'Membership statuses updated.',
            'date' => $today->format('Y-m-d'),
            'members_checked' => $checkedCount,
            'active_members_updated' => $updatedCount,
            'expired_count' => $expiredCount,
            'reactivated_count' => $reactivatedCount
        ], 200);
    }
    


}
