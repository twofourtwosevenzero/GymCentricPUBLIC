<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use App\Models\MonthlyClient;
use App\Models\Invoice;
use App\Models\InvoiceLineItem;
use App\Models\Payment;
use App\Models\PaymentInvoice;
use App\Models\Branch; // if needed
use App\Models\MonthlyClientAttendance;



class MonthlyClientController extends Controller
{
    /**
     * GET /monthly-clients
     */
    public function index()
    {
        
        $clients = MonthlyClient::orderBy('MonthlyClientID','desc')->get();
        return response()->json($clients);
    }

    /**
     * GET /monthly-clients/{id}
     */
    public function show($id)
    {
        $client = MonthlyClient::findOrFail($id);

        // Optionally check staff branch
        $staff = auth('staff')->user();
        if ($staff && $client->BranchID != $staff->BranchID) {
            abort(403, 'Not your branch');
        }

        return response()->json($client);
    }

    /**
     * POST /monthly-clients
     * Create a new monthly client with invoice/payment logic.
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'BranchID'                => 'nullable|exists:branches,BranchID',
            'FullName'                => 'required|string|max:255',
            'Email'                   => 'required|email|unique:monthly_clients,Email',
            'Phone'                   => 'nullable|string|max:50',
            'StartDate'               => 'nullable|date',
            'EndDate'                 => 'nullable|date|after_or_equal:StartDate',
            'MonthsToPayUpfront'      => 'nullable|integer|min:1',
            'Payments'                => 'array',
            'Payments.*.PaymentMethod'=> 'string|max:50',
            'Payments.*.PaymentAmount'=> 'numeric|min:0',
        ]);
    
        // If a staff user is logged in, use the branch from their associated branches.
        $staff = auth('staff')->user();
        if ($staff) {
            // Retrieve the branch id from the staff's associated branches.
            $branch = $staff->branches()->first();
            $data['BranchID'] = $branch ? $branch->BranchID : null;
        }
    
        DB::beginTransaction();
        try {
            // 1) Create the monthly client
            $client = MonthlyClient::create($data);
    
            // Default the StartDate to today if not provided
            $startDate = !empty($data['StartDate'])
                ? Carbon::parse($data['StartDate'])
                : Carbon::today();
            $client->StartDate = $startDate->format('Y-m-d');
    
            // 2) Calculate EndDate:
            // If the user does NOT supply an EndDate, set it to exactly 30 days after the StartDate.
            if (empty($data['EndDate'])) {
                $client->EndDate = $startDate->copy()->addDays(30)->format('Y-m-d');
            } else {
                // Use the user-provided EndDate
                $client->EndDate = Carbon::parse($data['EndDate'])->format('Y-m-d');
            }
    
            $client->save();
    
            // 3) Create invoice for the total monthly fee(s)
            $invoice = Invoice::create([
                'BranchID'         => $client->BranchID,
                'MemberID'         => null, // Because this is not an official member
                'MonthlyClientID'  => $client->MonthlyClientID,
                'InvoiceDate'      => now(),
                'DueDate'          => now(), // or use EndDate, as needed
                'InvoiceTotal'     => 0,
            ]);
    
            $monthlyFee = 2500; // fixed fee
            $monthsUpfront = $data['MonthsToPayUpfront'] ?? 1;
            $subtotal = $monthlyFee * $monthsUpfront;
    
            InvoiceLineItem::create([
                'InvoiceID'   => $invoice->InvoiceID,
                'ItemType'    => 'MonthlyClientFee', // or 'MonthlyMembership'
                'ItemID'      => null,
                'Description' => "Monthly fee x {$monthsUpfront} month(s)",
                'Quantity'    => $monthsUpfront,
                'UnitPrice'   => $monthlyFee,
                'Subtotal'    => $subtotal,
            ]);
    
            $invoice->InvoiceTotal = $subtotal;
            $invoice->save();
    
            // 4) Process split payments
            $paymentsData = $data['Payments'] ?? [];
            $allocatedSoFar = 0;
            foreach ($paymentsData as $payItem) {
                $payment = Payment::create([
                    'MemberID'         => null,
                    'MonthlyClientID'  => $client->MonthlyClientID,
                    'BranchID'         => $client->BranchID,
                    'PaymentMethod'    => $payItem['PaymentMethod'] ?? '',
                    'Amount'           => $payItem['PaymentAmount'] ?? 0,
                    'PaymentDate'      => now(),
                    'PaymentFor'       => ['Monthly Client Fee'],
                    'Status'           => 'Completed',
                ]);
    
                PaymentInvoice::create([
                    'PaymentID'       => $payment->PaymentID,
                    'InvoiceID'       => $invoice->InvoiceID,
                    'AmountAllocated' => $payItem['PaymentAmount'] ?? 0,
                ]);
    
                $allocatedSoFar += ($payItem['PaymentAmount'] ?? 0);
            }
    
            // Mark Invoice PaymentStatus
            if ($allocatedSoFar >= $invoice->InvoiceTotal) {
                $invoice->PaymentStatus = 'Paid';
            } elseif ($allocatedSoFar > 0) {
                $invoice->PaymentStatus = 'Partially Paid';
            } else {
                $invoice->PaymentStatus = 'Unpaid';
            }
            $invoice->save();
    
            DB::commit();
            return response()->json([
                'monthlyClient' => $client,
                'invoice'       => $invoice,
            ], 201);
    
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
    

    /**
     * PUT /monthly-clients/{id}
     * Update existing monthly client record.
     * (Optionally handle new payments, changing end date, etc.)
     */
    public function update(Request $request, $id)
    {
        $client = MonthlyClient::findOrFail($id);
        $staff  = auth('staff')->user();
    
        // if staff is logged in, confirm the client’s BranchID is in staff’s branches
        if ($staff) {
            $branchIDs = $staff->branches->pluck('BranchID')->toArray();
            if (! in_array($client->BranchID, $branchIDs)) {
                abort(403, 'Not your branch');
            }
        }
    
        // Now do your validation and update
        $data = $request->validate([
            'FullName'  => 'nullable|string|max:255',
            'Email'     => 'nullable|email|unique:monthly_clients,Email,' . $client->MonthlyClientID . ',MonthlyClientID',
            'Phone'     => 'nullable|string|max:50',
            'StartDate' => 'nullable|date',
            'EndDate'   => 'nullable|date|after_or_equal:StartDate',
            'IsActive'  => 'boolean',
        ]);
    
        $client->update($data);
    
        return response()->json($client);
    }
    
    /**
     * DELETE /monthly-clients/{id}
     * You might want to handle invoice/payment reversion, or just soft-delete the client.
     */
    public function destroy($id)
    {
        $client = MonthlyClient::findOrFail($id);

        $staff = auth('staff')->user();
        if ($staff && $client->BranchID != $staff->BranchID) {
            abort(403, 'Not your branch');
        }

        // Example: If you want to check for outstanding invoices, do so here

        $client->delete();
        return response()->json(['message' => 'MonthlyClient deleted']);
    }

    public function indexAttendances($monthlyClientID)
    {
        $client = MonthlyClient::findOrFail($monthlyClientID);

        // Staff branch check, if needed
        $staff = auth('staff')->user();
        if ($staff && $client->BranchID != $staff->BranchID) {
            abort(403, 'Not your branch');
        }

        // Eager-load or just get them
        $attendances = $client->attendances()
            ->orderBy('VisitDateTime', 'desc')
            ->get();

        return response()->json($attendances, 200);
    }

    // E.g. in MonthlyClientController
    public function indexAllAttendances()
    {
        // You can do a join or eager load:
        $attendances = MonthlyClientAttendance::with('monthlyClient')->get();

        return response()->json([
        'attendances' => $attendances
        ]);
    }


    /**
     * POST /monthly-clients/{monthlyClientID}/attendances
     * Create a new attendance record (like "Check-In").
     */
    public function storeAttendance(Request $request, $monthlyClientID)
    {
        $client = MonthlyClient::findOrFail($monthlyClientID);
    
        // Validate the request data
        $data = $request->validate([
            'VisitDateTime' => 'required|date',
            'Notes'         => 'nullable|string|max:255',
        ]);
    
        // Convert the ISO8601 datetime to MySQL datetime format
        $formattedVisitDateTime = Carbon::parse($data['VisitDateTime'])->format('Y-m-d H:i:s');
    
        // Create the attendance record for the monthly client
        $attendance = MonthlyClientAttendance::create([
            'MonthlyClientID' => $client->MonthlyClientID,
            'VisitDateTime'   => $formattedVisitDateTime,
            'Notes'           => $data['Notes'] ?? null,
        ]);
    
        return response()->json($attendance, 201);
    }
    

    
}
