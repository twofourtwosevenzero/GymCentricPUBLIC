<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\CoachingSession;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Models\Activity as SpatieActivity;


class SessionBooking extends Model
{
    protected $primaryKey = 'BookingID';

    protected $fillable = [
        'SessionID',
        'MemberID',
        'BookingDate',
        'PaymentID',
        'Status',
    ];

    public function session()
    {
        return $this->belongsTo(CoachingSession::class, 'SessionID', 'SessionID');
    }

    public function member()
    {
        return $this->belongsTo(Member::class, 'MemberID', 'MemberID');
    }

    public function payment()
    {
        return $this->belongsTo(Payment::class, 'PaymentID', 'PaymentID');
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->useLogName('session-booking')
            ->setDescriptionForEvent(fn ($eventName) => "Session Booking {$eventName}")
            ->logFillable()
            ->logOnlyDirty();
    }

    public function tapActivity(SpatieActivity $activity, string $eventName)    
    {
        // Example logic: use the member's StartedBranchID
        // or if session has a facility->branch, etc.
        $branchId = null;
        if ($this->relationLoaded('member') && $this->member->StartedBranchID) {
            $branchId = $this->member->StartedBranchID;
        }
        $activity->properties = $activity->properties->put('branch_id', $branchId);
    }
}
