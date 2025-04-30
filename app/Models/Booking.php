<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Models\Activity as SpatieActivity;


class Booking extends Model
{   
    use LogsActivity;
    protected $primaryKey = 'BookingID';

    protected $fillable = [
        'MemberID',
        'FacilityID',
        'PaymentID',
        'BookingDate',
        'BookingTime',
        'Duration',
        'GuestName',
        'GuestEmail',
    ];

    public function member()
    {
        return $this->belongsTo(Member::class, 'MemberID', 'MemberID');
    }

    public function facility()
    {
        return $this->belongsTo(Facility::class, 'FacilityID', 'FacilityID');
    }

    public function payment()
    {
        return $this->belongsTo(Payment::class, 'PaymentID', 'PaymentID');
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->useLogName('booking')
            ->setDescriptionForEvent(fn ($eventName) => "Booking {$eventName}")
            ->logFillable()
            ->logOnlyDirty();
    }

    public function tapActivity(SpatieActivity $activity, string $eventName)    
    {
        // for example, if booking -> facility -> branch
        // or booking -> member -> startedBranch
        $branchId = null;
        if ($this->relationLoaded('facility') && $this->facility->BranchID) {
            $branchId = $this->facility->BranchID;
        } elseif ($this->relationLoaded('member') && $this->member->StartedBranchID) {
            $branchId = $this->member->StartedBranchID;
        }

        $activity->properties = $activity->properties->put('branch_id', $branchId);
    }
}
