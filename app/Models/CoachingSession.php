<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CoachingSession extends Model
{
    protected $primaryKey = 'SessionID';
    protected $fillable = [
        'BranchID',   
        'SessionName',
        'SessionType',
        'CoachID',
        'StartTime',
        'EndTime',
        'Capacity',
        'Location',
        'Fee',
    ];

    public function coach()
    {
        return $this->belongsTo(Coach::class, 'CoachID', 'CoachID');
    }

        // If you did BranchID and have a Branch model:
    public function branch()
    {
         return $this->belongsTo(Branch::class, 'BranchID', 'BranchID');
    }

    // A session can have many bookings
    public function sessionBookings()
    {
        return $this->hasMany(SessionBooking::class, 'SessionID', 'SessionID');
    }

    // A session can have many attendances
    public function sessionAttendances()
    {
        return $this->hasMany(SessionAttendance::class, 'SessionID', 'SessionID');
    }

    // A session can have a waitlist
    public function sessionWaitlist()
    {
        return $this->hasMany(SessionWaitlist::class, 'SessionID', 'SessionID');
    }
}
