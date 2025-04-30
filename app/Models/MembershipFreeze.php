<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MembershipFreeze extends Model
{
    protected $primaryKey = 'FreezeID';

    protected $fillable = [
        'MemberID',
        'StartedBranchID', // ✅ Added this to allow mass assignment
        'FreezeStartDate',
        'FreezeEndDate',
        'Reason',
        'OriginalEndDate',
    ];

    // ✅ Relationship with Member
    public function member()
    {
        return $this->belongsTo(Member::class, 'MemberID', 'MemberID');
    }

    // ✅ Relationship with Branch (Added this)
    public function branch()
    {
        return $this->belongsTo(Branch::class, 'StartedBranchID', 'BranchID');
    }
}
