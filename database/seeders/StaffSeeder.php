<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;

class StaffSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Insert multiple staff accounts
        DB::table('staff')->insert([
            [
                'FullName' => 'John Staff',
                'Email' => 'staff@example.com',
                'password' => Hash::make('staff@123'),
                'Phone' => '09123456789',
                'DailyRate' => 500.00,
                'HourlyRate' => 50.00,
                'OvertimeRate' => 75.00,
                'DateHired' => now()->subMonths(3),
                'Notes' => 'Regular staff account for testing.',
                'remember_token' => Str::random(10),
                'created_at' => now(),
                'updated_at' => now(),
            ],
            // Add more staff as needed...
        ]);
    }
}
