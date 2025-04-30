<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Coach;

class CoachAvailability extends Model
{
    protected $table = 'coach_availabilities';

    protected $fillable = [
        'CoachID',
        'Start',
        'End'
    ];

    protected $casts = [
        'Start' => 'datetime',
        'End'   => 'datetime',
    ];

    // Link back to Coach
    public function coach()
    {
        return $this->belongsTo(Coach::class, 'CoachID', 'CoachID');
    }
}
