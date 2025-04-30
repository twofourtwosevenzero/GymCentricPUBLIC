<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class Owner extends Authenticatable
{
    use Notifiable;

    protected $table = 'owners'; // matches the migration
    protected $primaryKey = 'id';

    protected $fillable = [
        'name','email','password',
    ];

    protected $hidden = [
        'password','remember_token',
    ];
}
