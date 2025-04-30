<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Models\Activity as SpatieActivity;

class Payroll extends Model
{
    protected $primaryKey = 'PayrollID';

    protected $fillable = [
        'StaffID',
        'StartDate',
        'EndDate',
        'GrossPay',
        'Deductions',
        'CashAdvance',
        'NetPay',
        'GeneratedDate',
        'Status',
    ];

    public function staff()
    {
        return $this->belongsTo(Staff::class, 'StaffID', 'StaffID');
    }

    public function attendances()
    {
        return $this->hasMany(Attendance::class, 'PayrollID', 'PayrollID');
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->useLogName('payroll')
            ->setDescriptionForEvent(fn ($eventName) => "Payroll {$eventName}")
            ->logFillable()
            ->logOnlyDirty();
    }

    public function tapActivity(SpatieActivity $activity, string $eventName)    
    {
        // if staff has a single BranchID or if staff->branches
        // e.g. if staff->branches, pick the first
        $branchId = null;
        if ($this->relationLoaded('staff') && $this->staff->branches->count()) {
            $branchId = $this->staff->branches->first()->BranchID;
        }

        $activity->properties = $activity->properties->put('branch_id', $branchId);
    }
}
