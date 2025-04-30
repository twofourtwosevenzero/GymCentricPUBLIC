<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WalkIn extends Model
{
    protected $table = 'walk_ins';    // if your table is named "walk_ins"
    protected $primaryKey = 'WalkInID'; // if primary key is "WalkInID"
    public $timestamps = true;        // if you have created_at / updated_at

    protected $fillable = [
        'FullName',
        'VisitDate',
        'PaymentID',
        'Notes',
        'BranchID',
    ];
}
