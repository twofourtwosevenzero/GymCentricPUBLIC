<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Bonus extends Model
{
    protected $primaryKey = 'BonusID';

    protected $fillable = [
        'StaffID',
        'BonusAmount',
        'BonusDate',
        'Reason',
    ];

    public function staff()
    {
        return $this->belongsTo(Staff::class, 'StaffID', 'StaffID');
    }
}
