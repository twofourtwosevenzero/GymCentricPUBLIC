<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\MemberStatus;

class MemberStatusSeeder extends Seeder
{
    public function run()
    {
        // Example statuses with their primary keys
        // 1: Active
        MemberStatus::create([
            'MemberStatusID' => 1,
            'StatusName'     => 'ACTIVE'
        ]);

        // 2: Frozen
        MemberStatus::create([
            'MemberStatusID' => 2,
            'StatusName'     => 'FROZEN'
        ]);

        // 3: On-Hold
        MemberStatus::create([
            'MemberStatusID' => 3,
            'StatusName'     => 'ON-HOLD'
        ]);

        // 4: Terminated
        MemberStatus::create([
            'MemberStatusID' => 4,
            'StatusName'     => 'TERMINATED'
        ]);

        // 5: Expired
        MemberStatus::create([
            'MemberStatusID' => 5,
            'StatusName'     => 'EXPIRED'
        ]);

        MemberStatus::create([
            'MemberStatusID' => 6,
            'StatusName'     => 'PENDING'
        ]);
        MemberStatus::create([
            'MemberStatusID' => 7,
            'StatusName'     => 'INACTIVE'
        ]);
    }
}
