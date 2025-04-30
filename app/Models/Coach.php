<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\CoachingSession;
use Carbon\Carbon;

class Coach extends Model
{
    protected $primaryKey = 'CoachID';

    protected $fillable = [
        'FullName',
        'Specialty',
        'ContactInfo',
        'Email', 
    ];

    // A coach can have many sessions
    public function coachingSessions()
    {
        return $this->hasMany(CoachingSession::class, 'CoachID', 'CoachID');
    }

    public function availabilities()
    {
        return $this->hasMany(CoachAvailability::class, 'CoachID', 'CoachID');
    }

    public function isAvailableBetween($start, $end)
    {
        // 1) Convert to Carbon for easy comparisons
        $startTime = Carbon::parse($start);
        $endTime   = Carbon::parse($end);

        // 2) If you store multiple availability slots,
        //    check at least one slot covers [start, end].
        //    This is just an example of the logic you might need:
        foreach ($this->availabilities as $slot) {
            $slotStart = Carbon::parse($slot->Start);
            $slotEnd   = Carbon::parse($slot->End);

            // Does [start, end] fall fully inside [slotStart, slotEnd]?
            if ($startTime->greaterThanOrEqualTo($slotStart) &&
                $endTime->lessThanOrEqualTo($slotEnd)) {
                return true;
            }
        }

        // If no slot matched, coach is not available
        return false;
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->useLogName('coach')
            ->setDescriptionForEvent(fn ($eventName) => "Coach {$eventName}")
            ->logFillable()
            ->logOnlyDirty();
    }

}
