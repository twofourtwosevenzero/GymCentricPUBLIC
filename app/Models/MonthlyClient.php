<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;

class MonthlyClient extends Model
{
    use LogsActivity;

    protected $table = 'monthly_clients';
    protected $primaryKey = 'MonthlyClientID';

    protected $fillable = [
        'BranchID',
        'FullName',
        'Email',
        'Phone',
        'StartDate',
        'EndDate',
        'IsActive',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->useLogName('monthly_client')
            ->setDescriptionForEvent(fn (string $eventName) => "Monthly Client record {$eventName}")
            ->logFillable()
            ->logOnlyDirty();
    }

    // Relationship: This monthly client can have many invoices
    public function invoices()
    {
        return $this->hasMany(Invoice::class, 'MonthlyClientID', 'MonthlyClientID');
    }

    // Relationship: This monthly client can have many payments
    public function payments()
    {
        return $this->hasMany(Payment::class, 'MonthlyClientID', 'MonthlyClientID');
    }
    
    // If you want to link Branch
    public function branch()
    {
        return $this->belongsTo(Branch::class, 'BranchID', 'BranchID');
    }

    public function attendances()
{
    return $this->hasMany(MonthlyClientAttendance::class, 'MonthlyClientID', 'MonthlyClientID');
}
}
