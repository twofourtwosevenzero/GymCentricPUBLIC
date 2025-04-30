<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MemberVisit extends Model
{
    protected $table = 'member_visits';
    protected $primaryKey = 'VisitID';

    protected $fillable = [
        'BranchID',
        'MemberID',
        'VisitDate',
        'VisitTime',
        'CheckInMethod',
        'Remarks',
    ];
    
    protected $casts = [
        'BranchID' => 'integer',
        'MemberID' => 'integer',
    ];

    // Relationship: This visit record belongs to one branch
    public function branch()
    {
        return $this->belongsTo(Branch::class, 'BranchID', 'BranchID');
    }

    // Relationship: The member who visited
    public function member()
    {
        return $this->belongsTo(Member::class, 'MemberID', 'MemberID');
    }
}
