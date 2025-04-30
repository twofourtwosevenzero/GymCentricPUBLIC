<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Expense extends Model
{
    protected $table = 'expenses';
    protected $primaryKey = 'ExpenseID';

    protected $fillable = [
        'ExpenseDate',
        'ExpenseCategory',
        'Amount',
        'PaymentMethod',
        'StaffID',
        'Notes',
        'BranchID',
        'BusinessType', // <--- NEW: add this line
    ];

    // Relationship: The expense belongs to a branch
    public function branch()
    {
        return $this->belongsTo(Branch::class, 'BranchID', 'BranchID');
    }

    // Optionally link to staff
    public function staff()
    {
        return $this->belongsTo(Staff::class, 'StaffID', 'StaffID');
    }
}
