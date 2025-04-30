<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Payment;
use App\Models\Member;
use App\Models\Invoice;
use App\Models\PaymentInvoice;
use App\Models\SystemSetting; // if storing keys or fee rules in the DB
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\DB;

class PaymentController extends Controller
{
    /* ------------------------------------------------------------------
     * B) Transaction Logs
     * ------------------------------------------------------------------ */

    /**
     * 4. View all Payment Transactions.
     * Staff sees partial columns; Owner/Admin sees all.
     */
    public function indexTransactions()
    {
        $user = auth()->user();

        if ($user && $user->role === 'Staff') {
            // Partial columns for staff
            $payments = Payment::select('PaymentID', 'MemberID', 'Amount', 'Status', 'PaymentDate')
                               ->orderBy('PaymentDate', 'desc')
                               ->get();
        } else {
            // Owner/Admin => everything
            $payments = Payment::with('member')
                               ->orderBy('PaymentDate', 'desc')
                               ->get();
        }

        return Inertia::render('Payments/Transactions/Index', [
            'payments' => $payments
        ]);
    }

    /**
     * 5. Export/Print transaction histories (Owner/Admin)
     */
    public function exportTransactions()
    {
        $allPayments = Payment::orderBy('PaymentDate', 'desc')->get();

        $csvLines = [];
        $csvLines[] = "PaymentID,MemberID,Amount,Status,PaymentDate";
        foreach ($allPayments as $p) {
            $csvLines[] = "{$p->PaymentID},{$p->MemberID},{$p->Amount},{$p->Status},{$p->PaymentDate}";
        }
        $csvContent = implode("\n", $csvLines);

        return response($csvContent)
            ->header('Content-Type', 'text/csv')
            ->header('Content-Disposition', 'attachment; filename=transactions.csv');
    }

    /* ------------------------------------------------------------------
     * K) Payment (Direct Table) CRUD
     * ------------------------------------------------------------------ */

    /**
     * 27. Create Payment => (Owner,Admin,Staff)
     * Show form to record a direct Payment (cash/GCash/BPI).
     */
    public function create()
    {
        $members = Member::orderBy('FullName', 'asc')->get();

        return Inertia::render('Payments/Direct/Create', compact('members'));
    }

    /**
     * Store a new Payment record.
     * If your Payment table includes BranchID, validate it here.
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'BranchID'      => 'nullable|exists:branches,BranchID',
            'MemberID'      => 'nullable|exists:members,MemberID',
            'WalkInName'    => 'nullable|string|max:100',
            'BookingRef'    => 'nullable|string|max:100',
            'SessionRef'    => 'nullable|string|max:100',
            'PaymentFor'    => 'required|array|min:1',
            'PaymentFor.*'  => 'string|max:50',
            'PaymentMethod' => 'required|string|max:50',
            'Amount'        => 'required|numeric|min:0',
            'PaymentDate'   => 'required|date',
            'Status'        => 'required|string|max:50',
            'FailureReason' => 'nullable|string|max:255',
            'Note'          => 'nullable|string', // <-- New validation rule
        ]);
    
        // Automatically set BranchID based on logged-in staff if not provided
        if (empty($data['BranchID'])) {
            if (auth('staff')->check()) {
                $staff = auth('staff')->user();
                // Get staff's assigned branches
                $staffBranches = $staff->branches;
                
                if ($staffBranches->count() > 0) {
                    // Use the first branch if multiple are assigned
                    $data['BranchID'] = $staffBranches->first()->BranchID;
                }
            } elseif (auth('admin')->check() || auth('owner')->check()) {
                // For admin/owner, we could set a default branch or require them to specify
                // For now, use Branch ID 1 as default
                $data['BranchID'] = 1;
            }
        }
    
        // Ensure BranchID is never null after this point
        if (empty($data['BranchID'])) {
            return redirect()->back()
                ->withInput()
                ->withErrors(['BranchID' => 'A branch must be selected for this payment.']);
        }
    
        // Convert the PaymentFor array to JSON string if needed.
        $data['PaymentFor'] = json_encode($data['PaymentFor']);
    
        Payment::create($data);
    
        return redirect()
            ->route('payments.index')
            ->with('success', 'Payment created successfully.');
    }
    

    /**
     * 28. Read Payment Records => all roles.
     *
     * This method now returns payments filtered by BranchID when an admin is logged in.
     */
    public function index(Request $request)
    {
        $query = Payment::with(['member', 'monthlyClient'])
            ->orderBy('PaymentDate', 'desc');

        // Filter by branch if branch parameter is provided
        if ($request->has('branch') && $request->branch != 'all') {
            $query->where('BranchID', $request->branch);
        }

        $payments = $query->get();
    
        return response()->json($payments);
    }

    /**
     * 29. Update Payment Info => all roles.
     * Show edit form & process update.
     */
    public function edit($id)
    {
        $payment = Payment::findOrFail($id);
        $members = Member::orderBy('FullName', 'asc')->get();

        return Inertia::render('Payments/Direct/Edit', compact('payment', 'members'));
    }

    public function update(Request $request, $id)
    {
        $payment = Payment::findOrFail($id);
    
        $data = $request->validate([
            'BranchID'      => 'nullable|exists:branches,BranchID',
            'MemberID'      => 'nullable|exists:members,MemberID',
            'WalkInName'    => 'nullable|string|max:100',
            'BookingRef'    => 'nullable|string|max:100',
            'SessionRef'    => 'nullable|string|max:100',
            'PaymentFor'    => 'required|array|min:1',
            'PaymentFor.*'  => 'string|max:50',
            'PaymentMethod' => 'required|string|max:50',
            'Amount'        => 'required|numeric|min:0',
            'PaymentDate'   => 'required|date',
            'Status'        => 'required|string|max:50',
            'FailureReason' => 'nullable|string|max:255',
            'Note'          => 'nullable|string', // <-- New validation rule
        ]);
    
        // Ensure BranchID is not null when updating
        if (empty($data['BranchID'])) {
            if (auth('staff')->check()) {
                $staff = auth('staff')->user();
                // Get staff's assigned branches
                $staffBranches = $staff->branches;
                
                if ($staffBranches->count() > 0) {
                    // Use the first branch if multiple are assigned
                    $data['BranchID'] = $staffBranches->first()->BranchID;
                }
            } elseif (auth('admin')->check() || auth('owner')->check()) {
                // For admin/owner, use Branch ID 1 as default
                $data['BranchID'] = 1;
            }
        }
    
        // Final check to ensure BranchID is never null
        if (empty($data['BranchID'])) {
            return redirect()->back()
                ->withInput()
                ->withErrors(['BranchID' => 'A branch must be selected for this payment.']);
        }
    
        // If you store PaymentFor as JSON, you may want to encode it as in store():
        $data['PaymentFor'] = json_encode($data['PaymentFor']);
    
        $payment->update($data);
    
        return redirect()
            ->route('payments.index')
            ->with('success', 'Payment updated successfully.');
    }

    public function updateNote(Request $request, $id)
    {
        $payment = Payment::findOrFail($id);

        // Only validate Note
        $data = $request->validate([
            'Note' => 'nullable|string',
        ]);

        // Update just the Note
        $payment->update($data);

        // Return JSON for immediate reactivity on frontend
        return response()->json([
            'message' => 'Note updated successfully.',
            'payment' => $payment,
        ], 200);
    }


    /**
     * 30. Delete Payment => all roles.
     */
    public function destroy($id)
    {
        // Load the payment along with its related invoices.
        $payment = Payment::with('invoices')->findOrFail($id);

        DB::transaction(function () use ($payment) {
            // Loop through each related invoice.
            foreach ($payment->invoices as $invoice) {
                // Count how many payments reference this invoice.
                $paymentCount = $invoice->payments()->count();

                // If only this payment is linked, then delete the invoice.
                if ($paymentCount <= 1) {
                    $invoice->delete();
                }
                // Otherwise, you might want to detach this payment's pivot record.
            }

            // Finally, delete the payment record.
            $payment->delete();
        });

        return response()->json([
            'message' => 'Payment and associated invoice(s) (if unlinked) deleted successfully.'
        ], 200);
    }

    /* ------------------------------------------------------------------
     * M) Partial / Multiple Payments
     * ------------------------------------------------------------------ */

    /**
     * 35. Create Partial Payments => all roles.
     */
    public function createPartialPayment()
    {
        // Possibly list open invoices.
        $invoices = Invoice::whereNull('PaymentStatus')
                    ->orWhere('PaymentStatus', '!=', 'Paid')
                    ->orderBy('InvoiceDate', 'desc')
                    ->get();

        return Inertia::render('Payments/Partial/Create', [
            'invoices' => $invoices
        ]);
    }

    public function storePartialPayment(Request $request)
    {
        $data = $request->validate([
            'BranchID'          => 'nullable|exists:branches,BranchID',
            'MemberID'          => 'nullable|exists:members,MemberID',
            'PaymentFor'        => 'required|string|max:50',
            'PaymentMethod'     => 'required|string|max:50',
            'Amount'            => 'required|numeric|min:0',
            'PaymentDate'       => 'required|date',
            'Status'            => 'required|string|max:50',
            'allocatedInvoices' => 'required|array|min:1', // e.g. [{ invoiceId: ..., amountAllocated: ...}, ...]
        ]);

        DB::transaction(function () use ($data) {
            // 1) Create the Payment.
            $payment = Payment::create([
                'BranchID'      => $data['BranchID'] ?? null,
                'MemberID'      => $data['MemberID'] ?? null,
                'PaymentFor'    => $data['PaymentFor'],
                'PaymentMethod' => $data['PaymentMethod'],
                'Amount'        => $data['Amount'],
                'PaymentDate'   => $data['PaymentDate'],
                'Status'        => $data['Status'],
            ]);

            // 2) Link Payment to each Invoice.
            foreach ($data['allocatedInvoices'] as $alloc) {
                $invoiceId = $alloc['invoiceId'];
                $allocated = $alloc['amountAllocated'];

                PaymentInvoice::create([
                    'PaymentID'       => $payment->PaymentID,
                    'InvoiceID'       => $invoiceId,
                    'AmountAllocated' => $allocated,
                ]);

                // Optionally update the invoice's PaymentStatus.
                $invoice = Invoice::findOrFail($invoiceId);
                if ($allocated >= $invoice->InvoiceTotal) {
                    $invoice->update(['PaymentStatus' => 'Paid']);
                } else {
                    $invoice->update(['PaymentStatus' => 'Partially Paid']);
                }
            }
        });

        return redirect()
            ->route('payments.index')
            ->with('success', 'Partial payment created and allocated successfully.');
    }

    /**
     * 36. Link Multiple Payments => all roles.
     * Combine multiple Payment records for one Invoice.
     */
    public function linkPaymentsToInvoice(Request $request, $invoiceId)
    {
        $invoice = Invoice::findOrFail($invoiceId);

        $data = $request->validate([
            'paymentIds' => 'required|array|min:1', // e.g. [ PaymentID1, PaymentID2 ]
            'allocation' => 'required|array',       // keyed by PaymentID => amount
        ]);

        DB::transaction(function () use ($invoice, $data) {
            $sumAlloc = 0;

            foreach ($data['paymentIds'] as $pid) {
                $allocAmount = $data['allocation'][$pid] ?? 0;
                if ($allocAmount <= 0) {
                    continue;
                }

                PaymentInvoice::create([
                    'PaymentID'       => $pid,
                    'InvoiceID'       => $invoice->InvoiceID,
                    'AmountAllocated' => $allocAmount,
                ]);

                $sumAlloc += $allocAmount;
            }

            // If the sum allocated is greater than or equal to the invoice total, mark it as Paid.
            if ($sumAlloc >= $invoice->InvoiceTotal) {
                $invoice->update(['PaymentStatus' => 'Paid']);
            } else {
                $invoice->update(['PaymentStatus' => 'Partially Paid']);
            }
        });

        return redirect()
            ->route('invoices.show', $invoiceId)
            ->with('success', 'Payments allocated successfully.');
    }
}
