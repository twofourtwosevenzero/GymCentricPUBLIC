<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MembershipPlan extends Model
{
    // If your PK is `PlanID` instead of `id`:
    protected $primaryKey = 'PlanID';

    // Example fillable
    protected $fillable = [
        'PlanName',
        'Price',
        'Duration',
        'LockInMonths',
        'BillingMode',
    ];

    // Relationship: A plan can be linked to many members
    public function members()
    {
        return $this->hasMany(Member::class, 'PlanID', 'PlanID');
    }

    // Relationship: A plan can appear in many membership renewals
    public function membershipRenewals()
    {
        return $this->hasMany(MembershipRenewal::class, 'PlanID', 'PlanID');
    }

    // Relationship: Might be oldPlan or newPlan in membership changes
    public function oldChangeLogs()
    {
        return $this->hasMany(MembershipChangeLog::class, 'OldPlanID', 'PlanID');
    }

    public function newChangeLogs()
    {
        return $this->hasMany(MembershipChangeLog::class, 'NewPlanID', 'PlanID');
    }
}

