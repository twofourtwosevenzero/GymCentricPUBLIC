<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Attendance extends Model
{
    protected $primaryKey = 'AttendanceID';

    protected $fillable = [
        'StaffID',
        'PayrollID',
        'Date',
        'TimeIn',
        'TimeOut',
        'HoursWorked',
        'OvertimeHours',
        'NightDiffHours',  // new
        'LateMinutes',     // new
    ];

    public function staff()
    {
        return $this->belongsTo(Staff::class, 'StaffID', 'StaffID');
    }

    public function payroll()
    {
        return $this->belongsTo(Payroll::class, 'PayrollID', 'PayrollID');
    }
}
