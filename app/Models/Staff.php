<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;  // <— instead of Model
use Illuminate\Notifications\Notifiable;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Models\Activity as SpatieActivity;

class Staff extends Authenticatable
{
    use Notifiable;
    use LogsActivity;

    protected $table = 'staff';
    protected $primaryKey = 'StaffID';

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'FullName',
        'Role',
        'Email',
        'Phone',
        'DailyRate',
        'HourlyRate',
        'OvertimeRate',
        'DateHired',
        'Notes',
        'password',    // <— add this if you want to do Eloquent-based inserts
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->useLogName('staff')
            ->setDescriptionForEvent(fn ($eventName) => "Staff {$eventName}")
            ->logFillable()
            ->logOnlyDirty();
    }

    /**
     * If staff belongs to multiple branches via pivot, 
     * pick one or store an array. Example: store the first pivot's ID.
     */
    public function tapActivity(SpatieActivity $activity, string $eventName)    
    {
        $branchId = null;
        if ($this->relationLoaded('branches') && $this->branches->count() > 0) {
            $branchId = $this->branches->first()->BranchID;
        }
        // otherwise, if staff has a single 'BranchID' column, do:
        // $branchId = $this->BranchID;

        $activity->properties = $activity->properties->put('branch_id', $branchId);
    }

    /**
     * The attributes that should be hidden for arrays.
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    // Now your relationships remain exactly the same
    // (Attendances, Payrolls, Tasks, Schedules, etc.)

    public function attendances()
    {
        return $this->hasMany(Attendance::class, 'StaffID', 'StaffID');
    }

    public function payrolls()
    {
        return $this->hasMany(Payroll::class, 'StaffID', 'StaffID');
    }

    public function tasks()
    {
        return $this->hasMany(StaffTask::class, 'StaffID', 'StaffID');
    }

    public function schedules()
    {
        return $this->hasMany(StaffSchedule::class, 'StaffID', 'StaffID');
    }

    public function bonuses()
    {
        return $this->hasMany(Bonus::class, 'StaffID', 'StaffID');
    }

    public function systemLogs()
    {
        return $this->hasMany(SystemLog::class, 'UserID', 'StaffID');
    }

    public function productInventoryLogs()
    {
        return $this->hasMany(ProductInventoryLog::class, 'StaffID', 'StaffID');
    }

    public function expenses()
    {
        return $this->hasMany(Expense::class, 'StaffID', 'StaffID');
    }

    public function branches()
    {
        return $this->belongsToMany(Branch::class, 'branch_staff', 'StaffID', 'BranchID');
    }
    
        public function maintenanceLogs()
    {
        return $this->hasMany(MaintenanceLog::class, 'MaintainedBy', 'StaffID');
    }

    public function getHourlyRateAttribute() {
        return $this->DailyRate ? $this->DailyRate / 8 : 0;
    }
    public function getOvertimeRateAttribute() {
        return $this->HourlyRate * 1.25;
    }

    public function getDefaultBranchIdAttribute()
{
    // Make sure the 'branches' relationship is loaded:
    // (You can do $this->load('branches') in the controller or method.)
    if ($this->branches->isEmpty()) {
        return null;
    }

    // 1) If you just want the FIRST branch in the pivot:
    //    (This only makes sense if staff truly belongs to a single or 
    //     “primary” branch and the pivot is basically 1 record.)
    return $this->branches->first()->BranchID;

    // 2) If you want to pick the pivot row where e.g. 'IsDefault' = 1:
    //    return $this->branches->where('pivot.IsDefault', 1)
    //                          ->first()
    //                          ->BranchID ?? null;
}

    
}
