<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use League\Csv\Reader;
use Carbon\Carbon;
// Models
use App\Models\Member;
use App\Models\MembershipPlan;
use App\Models\MemberStatus;
use App\Models\MembershipFreeze;

class MemberSeeder extends Seeder
{
    public function run()
    {
        $csvPath = storage_path('app/private/members.csv');
        $csv = Reader::createFromPath($csvPath, 'r');

        // Define the header based on your updated CSV columns
        $header = [
            'NO',
            'NAME',
            'RATE',
            'MEMBERSHIP START',
            'PHONE NUMBER',
            'EMAIL',
            'MEMBERSHIP END',
            'LAST PAYMENT DATE',
            'LOCK-IN END DATE',
            'MEMBERSHIP STATUS',
            'NOTES'
        ];

        // Get records using the custom header
        $records = $csv->getRecords($header);

        // Initialize counter for membership card numbers for branch 1
        $counter = 1;

        foreach ($records as $record) {
            // Trim and get the full name
            $fullName = isset($record['NAME']) ? trim($record['NAME']) : null;
            if (empty($fullName)) {
                // Skip record if no name provided
                continue;
            }

            // Generate membership card number as A-1, A-2, etc.
            $membershipCardNumber = "A-" . $counter;
            $counter++;

            $rawRate             = $record['RATE'] ?? null;
            $membershipStart     = $record['MEMBERSHIP START'] ?? '';
            $phone               = $record['PHONE NUMBER'] ?? null;
            $email               = $record['EMAIL'] ?? null;
            $membershipEnd       = $record['MEMBERSHIP END'] ?? '';
            $lastPaymentDate     = $record['LAST PAYMENT DATE'] ?? '';
            $lockInEndDateRaw    = $record['LOCK-IN END DATE'] ?? '';
            $membershipStatusRaw = trim($record['MEMBERSHIP STATUS'] ?? 'active');
            $notes               = $record['NOTES'] ?? '';

            // Parse dates using a helper
            $startDate   = $this->parseDate($membershipStart);
            $endDate     = $this->parseDate($membershipEnd);
            $lockInEndDt = $this->parseDate($lockInEndDateRaw);

            // For this combined CSV, we don't have a CARDS column – default to false.
            $membershipCardIssued = false;
            
            // Assume free sessions is 0 since it's not in your CSV.
            $freeSessions = 0;

            // Get or create the membership plan based on RATE.
            $plan = $this->getOrCreatePlan($rawRate);

            // Determine MemberStatusID from the CSV "MEMBERSHIP STATUS" (converted to lowercase).
            $memberStatusID = $this->getOrCreateMemberStatus(strtolower($membershipStatusRaw));

            // Insert the member record.
            $member = Member::create([
                'StartedBranchID'       => 1,
                'FullName'              => $fullName,
                'Email'                 => $email,
                'Phone'                 => $phone,
                'PlanID'                => $plan->PlanID,
                'MembershipCardNumber'  => $membershipCardNumber,
                'MembershipCardIssued'  => $membershipCardIssued,
                'MemberStatusID'        => $memberStatusID,
                'MembershipStartDate'   => $startDate,
                'MembershipEndDate'     => $endDate ?: null,
                'LockedInEndDate'       => $lockInEndDt ?: null,
                'FreeSessions'          => $freeSessions,
                'Notes'                 => $notes,
            ]);

            // If the member's status is "frozen", create a membership freeze record
            // with blank (null) date values so staff can update them later.
            if (strtolower($membershipStatusRaw) === 'frozen') {
                MembershipFreeze::create([
                    'MemberID'         => $member->MemberID,
                    'StartedBranchID'  => 1,
                    'FreezeStartDate'  => null, // blank date
                    'FreezeEndDate'    => null,
                    'OriginalEndDate'  => null,
                    'Reason'           => ''    // leave blank
                ]);
            }
        }
    }

    private function parseDate($dateString)
    {
        if (empty($dateString)) {
            return null;
        }
        try {
            return Carbon::parse($dateString)->format('Y-m-d');
        } catch (\Exception $e) {
            return null;
        }
    }

    private function getOrCreatePlan($rateValue)
    {
        $rateTrimmed = strtoupper(trim($rateValue));
        if ($rateTrimmed === 'FREE') {
            $price = 0;
            $planName = 'Free Plan';
        } else {
            $price = (float)$rateValue;
            if ($price === 1599.0) {
                $planName = 'Discounted Plan';
            } elseif ($price === 1999.0) {
                $planName = 'Regular Plan';
            } else {
                $planName = 'Plan ' . $rateValue;
            }
        }

        return MembershipPlan::firstOrCreate(
            ['Price' => $price],
            [
                'PlanName'     => $planName,
                'Duration'     => 30,
                'LockInMonths' => 3,
                'BillingMode'  => 'monthly',
            ]
        );
    }

    private function getOrCreateMemberStatus($statusName)
    {
        if (empty($statusName)) {
            return 1; // Default to ACTIVE
        }
        $existing = MemberStatus::whereRaw('LOWER(StatusName) = ?', [$statusName])->first();
        if ($existing) {
            return $existing->MemberStatusID;
        }
        $newStatus = MemberStatus::create(['StatusName' => strtoupper($statusName)]);
        return $newStatus->MemberStatusID;
    }
}
