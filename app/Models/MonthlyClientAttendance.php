<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class MonthlyClientAttendance extends Model
{
    protected $table = 'monthly_client_attendances';
    protected $primaryKey = 'MonthlyClientAttendanceID';

    protected $fillable = [
        'MonthlyClientID',
        'VisitDateTime',
        'Notes',
    ];

    // Tell Eloquent to treat this column as a date/datetime
    protected $dates = ['VisitDateTime'];

    // Relationship back to MonthlyClient
    public function monthlyClient()
    {
        return $this->belongsTo(MonthlyClient::class, 'MonthlyClientID', 'MonthlyClientID');
    }

    public function getVisitDateTimeAttribute($value)
    {
        if (!$value) {
            return null;
        }
        // Option 1: "YYYY-MM-DDTHH:mm:ss"
        return Carbon::parse($value)->format('Y-m-d\TH:i:s');

    }
}
