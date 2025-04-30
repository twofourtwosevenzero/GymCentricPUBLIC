<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Locker extends Model
{
    protected $table = 'lockers';
    protected $primaryKey = 'LockerID';

    protected $fillable = [
        'LockerNumber',
        'Status',
        'Notes',
        'BranchID', // <--- new column
    ];

    // Relationship: A locker is in one branch
    public function branch()
    {
        return $this->belongsTo(Branch::class, 'BranchID', 'BranchID');
    }

    public function lockerUsages()
    {
        return $this->hasMany(LockerUsage::class, 'LockerID', 'LockerID');
    }
}
