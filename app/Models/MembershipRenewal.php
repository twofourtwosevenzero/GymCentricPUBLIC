<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MembershipRenewal extends Model
{
    protected $table = 'membership_renewals';
    protected $primaryKey = 'RenewalID';
    public $timestamps = false; // or true, if you actually have created_at/updated_at

    protected $fillable = [
        'MemberID',
        'PlanID',
        'RenewalAmount',
        'RenewalDate',
        'RenewalStartDate',
        'BranchID',               // <--- Add this line
    ];

    // Relationship: belongs to a member
    public function member()
    {
        return $this->belongsTo(Member::class, 'MemberID', 'MemberID');
    }

    // Relationship: belongs to a plan
    public function plan()
    {
        return $this->belongsTo(MembershipPlan::class, 'PlanID', 'PlanID');
    }

    // Relationship: belongs to a branch (optional if you need it)
    public function branch()
    {
        return $this->belongsTo(Branch::class, 'BranchID', 'BranchID');
    }
}
