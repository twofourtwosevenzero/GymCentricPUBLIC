<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DailyCashFlow extends Model
{
    protected $table = 'dailycashflow'; 
    protected $primaryKey = 'CashFlowID';

    // No WalkInXxx columns here anymore
    protected $fillable = [
        'Date',
        'BusinessType',
        'CashSales',
        'GCashSales',
        'BPISales',
        'BDOSales',
        'TotalSales',
        'PettyCash',
        'PettyCashTomorrow',
        'DepositedAmount',
        'Remarks',
        'BranchID',
    ];
    
    public function branch()
    {
        return $this->belongsTo(Branch::class, 'BranchID', 'BranchID');
    }
}
