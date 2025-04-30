<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LockerUsage extends Model
{
    protected $primaryKey = 'UsageID';

    protected $fillable = [
        'LockerID',
        'MemberID',
        'WalkInName',        // ← ADD THIS
        'KeyBorrowed',
        'BorrowDate',
        'ReturnDate',
        'Returned',
        'Notes',
    ];

    public function locker()
    {
        return $this->belongsTo(Locker::class, 'LockerID', 'LockerID');
    }

    public function member()
    {
        return $this->belongsTo(Member::class, 'MemberID', 'MemberID');
    }
}
