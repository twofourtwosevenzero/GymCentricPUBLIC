<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\CoachingSession;


class SessionWaitlist extends Model
{
    protected $primaryKey = 'WaitlistID';

    protected $fillable = [
        'SessionID',
        'MemberID',
        'WaitlistDate',
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
}
