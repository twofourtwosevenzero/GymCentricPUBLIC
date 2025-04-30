<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Models\Activity as SpatieActivity;

class Payment extends Model
{
    protected $table = 'payments';
    protected $primaryKey = 'PaymentID';

    protected $fillable = [
        'BranchID',
        'MemberID',
        'WalkInName',
        'PayerName',
        'BookingRef',
        'SessionRef',
        'MonthlyClientID',
        'PaymentFor',      
        'PaymentMethod',
        'Amount',
        'PaymentDate',
        'Status',
        'FailureReason',
        'Note',  // <-- New field added here
    ];

    protected $casts = [
        'PaymentFor' => 'array', // Eloquent auto-converts JSON <-> array
    ];
    
    public function branch()
    {
        return $this->belongsTo(Branch::class, 'BranchID', 'BranchID');
    }

    public function member()
    {
        return $this->belongsTo(Member::class, 'MemberID', 'MemberID');
    }

    // many-to-many with invoices
    public function invoices()
    {
        return $this->belongsToMany(Invoice::class, 'PaymentInvoices', 'PaymentID', 'InvoiceID')
                    ->withPivot('AmountAllocated')
                    ->withTimestamps();
    }

    public function monthlyClient()
    {
        return $this->belongsTo(MonthlyClient::class, 'MonthlyClientID');
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->useLogName('payment')
            ->setDescriptionForEvent(fn ($eventName) => "Payment {$eventName}")
            ->logFillable()
            ->logOnlyDirty();
    }

    public function tapActivity(SpatieActivity $activity, string $eventName)    
    {
        // direct column
        $branchId = $this->BranchID;
        $activity->properties = $activity->properties->put('branch_id', $branchId);
    }
}
