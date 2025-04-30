<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\Pivot;

class BranchStaff extends Pivot
{
    protected $table = 'branch_staff';
    protected $primaryKey = ['BranchID', 'StaffID'];
    public $incrementing = false;
}
