<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MembershipChangeLog extends Model
{
    protected $primaryKey = 'ChangeID';

    protected $fillable = [
        'MemberID',
        'OldPlanID',
        'NewPlanID',
        'ChangeDate',
        'Reason',
        'Notes',
    ];

    public function member()
    {
        return $this->belongsTo(Member::class, 'MemberID', 'MemberID');
    }

    public function oldPlan()
    {
        return $this->belongsTo(MembershipPlan::class, 'OldPlanID', 'PlanID');
    }

    public function newPlan()
    {
        return $this->belongsTo(MembershipPlan::class, 'NewPlanID', 'PlanID');
    }
}
