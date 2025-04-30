<?php

namespace App\Observers;

use App\Models\Payment;
use App\Models\DailyCashFlow;
use Illuminate\Support\Carbon;

class PaymentObserver
{
    /**
     * Handle the Payment "created" event.
     */
    public function created(Payment $payment)
    {
        // Add the new payment amount to the DailyCashFlow
        $this->applyPaymentToDailyCashFlow($payment);
    }

    /**
     * Handle the Payment "updated" event.
     */
    public function updated(Payment $payment)
    {
        // If date, branch, method, or amount changed, remove old data first
        if ($payment->wasChanged(['BranchID','PaymentDate','PaymentMethod','Amount'])) {
            $original = $payment->getOriginal(); // old data
            $this->removePaymentFromDailyCashFlow($original);
            $this->applyPaymentToDailyCashFlow($payment);
        }
    }

    /**
     * Handle the Payment "deleted" event.
     */
    public function deleted(Payment $payment)
    {
        // Remove the payment from the daily cash flow
        $original = $payment->toArray();
        $this->removePaymentFromDailyCashFlow($original);
    }

    private function applyPaymentToDailyCashFlow(Payment $payment)
    {
        // 1) Convert PaymentDate to date only, if needed
        $date = Carbon::parse($payment->PaymentDate)->format('Y-m-d');
        
        // Default to branch ID 1 if the payment has no branch
        $branchID = $payment->BranchID ?? 1;
        
        // 2) Find or create daily cash flow
        $cashFlow = DailyCashFlow::firstOrCreate(
            [
                'BranchID' => $branchID,
                'Date'     => $date,
            ],
            [
                'BusinessType' => 'Gym',
                'CashSales'    => 0,
                'GCashSales'   => 0,
                'BPISales'     => 0,
                'BDOSales'     => 0,
                'TotalSales'   => 0,
            ]  
        );

        // 3) Add the Payment->Amount to the correct column
        $method = strtolower($payment->PaymentMethod);
        
        if (strpos($method, 'gcash') !== false) {
            $cashFlow->GCashSales += $payment->Amount;
        } elseif (strpos($method, 'bpi') !== false) {
            $cashFlow->BPISales += $payment->Amount;
        } elseif (strpos($method, 'bdo') !== false) {
            $cashFlow->BDOSales += $payment->Amount;
        } elseif (strpos($method, 'cash') !== false || empty($method)) {
            $cashFlow->CashSales += $payment->Amount;
        } else {
            // Default to Cash for any unrecognized method
            $cashFlow->CashSales += $payment->Amount;
        }

        // 4) Recompute total
        $cashFlow->TotalSales =
            ($cashFlow->CashSales ?? 0) +
            ($cashFlow->GCashSales ?? 0) +
            ($cashFlow->BPISales ?? 0) +
            ($cashFlow->BDOSales ?? 0);

        $cashFlow->save();
    }

    private function removePaymentFromDailyCashFlow(array $oldData)
    {
        // oldData has 'BranchID','PaymentDate','PaymentMethod','Amount'
        if (empty($oldData['PaymentDate'])) {
            return;
        }

        // Default to branch ID 1 if the payment has no branch
        $branchID = $oldData['BranchID'] ?? 1;

        // Convert old PaymentDate to date only
        $oldDate = substr($oldData['PaymentDate'], 0, 10);

        $cashFlow = DailyCashFlow::where('BranchID', $branchID)
            ->where('Date', $oldDate)
            ->first();
        if (!$cashFlow) {
            return; // nothing to remove
        }

        // Update payment method logic
        $method = strtolower($oldData['PaymentMethod']);
        
        if (strpos($method, 'gcash') !== false) {
            $cashFlow->GCashSales -= $oldData['Amount'];
        } elseif (strpos($method, 'bpi') !== false) {
            $cashFlow->BPISales -= $oldData['Amount'];
        } elseif (strpos($method, 'bdo') !== false) {
            $cashFlow->BDOSales -= $oldData['Amount'];
        } elseif (strpos($method, 'cash') !== false || empty($method)) {
            $cashFlow->CashSales -= $oldData['Amount'];
        } else {
            // Default to Cash for any unrecognized method
            $cashFlow->CashSales -= $oldData['Amount'];
        }

        $cashFlow->TotalSales =
            ($cashFlow->CashSales ?? 0) +
            ($cashFlow->GCashSales ?? 0) +
            ($cashFlow->BPISales ?? 0) +
            ($cashFlow->BDOSales ?? 0);

        $cashFlow->save();
    }
}
