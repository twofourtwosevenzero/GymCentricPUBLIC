<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StaffTask extends Model
{
    protected $primaryKey = 'TaskID';

    protected $fillable = [
        'StaffID',
        'TaskDescription',
        'TaskDate',
        'Status',
    ];

    public function staff()
    {
        return $this->belongsTo(Staff::class, 'StaffID', 'StaffID');
    }
}
