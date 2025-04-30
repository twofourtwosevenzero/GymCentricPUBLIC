<?php
// app/Services/VisitLogger.php
namespace App\Services;

use Illuminate\Support\Carbon;
use App\Models\MemberVisit;

class VisitLogger
{
    /**
     * Log a biometric check-in for a member.
     * Prevents duplicate entries for the same member and day.
     *
     * @param int $memberId
     * @param int|null $branchId
     * @return bool|string Returns true if a new visit was logged;
     *                     otherwise returns a message that the member is already checked in.
     */
    public function logBiometricCheckIn(int $memberId, ?int $branchId)
    {
        $today = Carbon::today()->toDateString();

        // Check if a visit already exists for this member today.
        $exists = MemberVisit::where('MemberID', $memberId)
            ->whereDate('VisitDate', $today)
            ->exists();

        if ($exists) {
            return "Member already checked in today.";
        }

        // Create new visit record.
        MemberVisit::create([
            'BranchID'      => $branchId,
            'MemberID'      => $memberId,
            'VisitDate'     => $today,
            'VisitTime'     => Carbon::now()->format('H:i:s'),
            'CheckInMethod' => 'biometric',
            'Remarks'       => null,
        ]);

        return true;
    }
}
