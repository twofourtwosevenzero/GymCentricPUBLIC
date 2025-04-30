<?php

namespace App\Observers;

use App\Models\Staff;
use App\Models\SystemLog;
use Illuminate\Support\Facades\Auth;

class StaffObserver
{
    public function created(Staff $staff)
    {
        SystemLog::create([
            'UserID'    => Auth::id() ?? null,
            'Action'    => "Created staff #{$staff->StaffID}",
            'Timestamp' => now(),
            'IPAddress' => request()->ip(),
            'Details'   => "Full Name: {$staff->FullName}",
        ]);
    }

    public function updated(Staff $staff)
    {
        // You can figure out what changed:
        $changes = $staff->getChanges(); 
        // Or store a JSON of old/new:
        // e.g. $old = $staff->getOriginal(); $new = $staff->getAttributes();

        SystemLog::create([
            'UserID'    => Auth::id() ?? null,
            'Action'    => "Updated staff #{$staff->StaffID}",
            'Timestamp' => now(),
            'IPAddress' => request()->ip(),
            'Details'   => json_encode($changes),
        ]);
    }

    public function deleted(Staff $staff)
    {
        SystemLog::create([
            'UserID'    => Auth::id() ?? null,
            'Action'    => "Deleted staff #{$staff->StaffID}",
            'Timestamp' => now(),
            'IPAddress' => request()->ip(),
            'Details'   => "Staff record removed.",
        ]);
    }
}
