<?php

// app/Models/Admin.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class Admin extends Authenticatable
{
    use HasFactory;

    protected $table = 'admins';
    protected $primaryKey = 'AdminID';

    // Fillable or guarded fields
    protected $fillable = [
        'FullName',
        'Email',
        'password',
        'Role',
    ];

    // Many-to-many relation to Branch
    public function branches()
    {
        // If your pivot table is named 'admin_branch'
        return $this->belongsToMany(
            Branch::class, 
            'admin_branch',    // pivot table
            'AdminID',         // foreign key on pivot table
            'BranchID'         // related key on pivot table
        );
    }
}