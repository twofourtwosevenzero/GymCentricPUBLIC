<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Carbon\Carbon;
use Faker\Factory as Faker;

// Models
use App\Models\Branch;
use App\Models\Owner;
use App\Models\Admin;
use App\Models\Staff;
use App\Models\MembershipPlan;
use App\Models\Member;
use App\Models\MembershipRenewal;
use App\Models\MembershipFreeze;
use App\Models\MembershipChangeLog;
use App\Models\MemberVisit;
use App\Models\StaffSchedule;
use App\Models\StaffTask;
use App\Models\Payroll;
use App\Models\Attendance;
use App\Models\Bonus;
use App\Models\Promotions;
use App\Models\Invoice;
use App\Models\InvoiceLineItem;
use App\Models\Payment;
use App\Models\PaymentInvoice;
use App\Models\Facility;
use App\Models\Booking;
use App\Models\DailyCashFlow;
use App\Models\WalkIn;
use App\Models\Equipment;
use App\Models\MaintenanceLog;
use App\Models\Coach;
use App\Models\CoachingSession;
use App\Models\SessionBooking;
use App\Models\SessionWaitlist;
use App\Models\SessionAttendance;
use App\Models\Locker;
use App\Models\LockerUsage;
use App\Models\SystemLog;
use App\Models\Product;
use App\Models\ProductInventoryLog;
use App\Models\Notification;
use App\Models\NotificationTemplate;
use App\Models\Expense;

use Database\Seeders\MemberStatusSeeder;

class TestDataSeeder extends Seeder
{
    public function run()
    {
        $faker = Faker::create();

        // Seed member statuses first.
        $this->call(MemberStatusSeeder::class);

        // 1) Branches
        $branches = [];
        for ($i = 1; $i <= 2; $i++) {
            $branches[] = Branch::create([
                'BranchName' => "Contnental Branch $i",
                'Location'   => "Sputnik St., Torres Ave., Davao City",
            ]);
        }
        // 2) Owners 
        Owner::create([
            'name'     => 'Owner',
            'email'    => 'owner@example.com',
            'password' => Hash::make('owner123'),
        ]);

        // 4) Staff Account
        $staff = Staff::create([
            'FullName'   => "Staff User",
            'Role'       => 'Manager',
            'Email'      => "staff@example.com",
            'Phone'      => $faker->phoneNumber,
            'DailyRate'  => 1000,
            'DateHired'  => $faker->dateTimeBetween('-1 year', 'now'),
            'Notes'      => "Primary staff account",
            'password'   => Hash::make('staff123'),
        ]);
        
        // Attach staff to all branches
        foreach ($branches as $branch) {
            $staff->branches()->attach($branch->BranchID);
        }
        
        $this->command->info('Staff account created successfully.');

        // 29) Lockers
        $lockers = [];
        foreach ($branches as $branchPick) {
            for ($i = 1; $i <= 54; $i++) {
                $lockers[] = Locker::create([
                    'BranchID'     => $branchPick->BranchID,
                    'LockerNumber' => (string) $i,
                    'Status'       => $faker->randomElement(['Available']),
                    'Notes'        => $faker->sentence,
                ]);
            }
        }

        $this->command->info('Faker test data seeded successfully.');
    }
}
