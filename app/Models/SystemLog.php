<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SystemLog extends Model
{
    protected $primaryKey = 'LogID';

    protected $fillable = [
        'UserID',
        'Action',
        'Timestamp',
        'IPAddress',
        'Details',
    ];

    public function user()
    {
        // Staff table as user
        return $this->belongsTo(Staff::class, 'UserID', 'StaffID');
    }
}
