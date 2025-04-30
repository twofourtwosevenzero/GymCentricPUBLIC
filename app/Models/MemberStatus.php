<?php

// app/Models/MemberStatus.php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MemberStatus extends Model
{
    protected $table = 'member_statuses';
    protected $primaryKey = 'MemberStatusID';
    public $timestamps = false;

    protected $fillable = [
        'MemberStatusID',
        'StatusName',
    ];

    // If you want to define relationship:
    public function members()
    {
        return $this->hasMany(Member::class, 'MemberStatusID', 'MemberStatusID');
    }
}

