<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\CoachingSession;


class SessionAttendance extends Model
{
    protected $primaryKey = 'AttendanceID';

    protected $fillable = [
        'SessionID',
        'MemberID',
        'AttendanceDate',
    ];

    public function session()
    {
        return $this->belongsTo(CoachingSession::class, 'SessionID', 'SessionID');
    }

    public function member()
    {
        return $this->belongsTo(Member::class, 'MemberID', 'MemberID');
    }
}
