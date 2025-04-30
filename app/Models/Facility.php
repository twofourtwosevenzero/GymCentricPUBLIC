<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Facility extends Model
{
    protected $table = 'facilities';   // If your table is named "facilities"
    protected $primaryKey = 'FacilityID';

    protected $fillable = [
        'BranchID',
        'FacilityName',
        'Description',
        'Status',
    ];

    // Relationship: A facility belongs to one branch
    public function branch()
    {
        return $this->belongsTo(Branch::class, 'BranchID', 'BranchID');
    }

    public function bookings()
    {
        return $this->hasMany(Booking::class, 'FacilityID', 'FacilityID');
    }
}
