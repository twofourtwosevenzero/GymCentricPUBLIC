<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Carbon\Carbon;
use App\Models\DailyCashFlow;

class ShiftPettyCash extends Command
{
    /**
     * The name and signature of the console command.
     *
     * E.g. 'petty:shift' => php artisan petty:shift
     */
    protected $signature = 'petty:shift';

    /**
     * The console command description.
     */
    protected $description = 'Copy PettyCashTomorrow from yesterday’s DailyCashFlow into today’s PettyCash';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        // 1) We assume "today" is the current date, local timezone
        $today     = Carbon::today(); 
        $yesterday = Carbon::yesterday();

        // 2) Get all daily flows from YESTERDAY that have a PettyCashTomorrow > 0
        $yesterdayFlows = DailyCashFlow::whereDate('Date', $yesterday)
            ->where('PettyCashTomorrow', '>', 0)
            ->get();

        if ($yesterdayFlows->isEmpty()) {
            $this->info("No petty-cash-tomorrow entries found for {$yesterday->toDateString()}");
            return 0;
        }

        foreach ($yesterdayFlows as $flow) {
            $tomorrowValue = $flow->PettyCashTomorrow;

            // 3) Find or create today's record for the same branch + business
            //    e.g. if the logic is same BranchID, same BusinessType
            $todayFlow = DailyCashFlow::firstOrCreate(
                [
                    'BranchID'     => $flow->BranchID,
                    'BusinessType' => $flow->BusinessType,
                    'Date'         => $today->format('Y-m-d'),
                ],
                [
                    'CashSales'        => 0,
                    'GCashSales'       => 0,
                    'BPISales'         => 0,
                    'BDOSales'         => 0,
                    'WalkInCashSales'  => 0,
                    'WalkInGCashSales' => 0,
                    'WalkInBPISales'   => 0,
                    'WalkInBDOSales'   => 0,
                    'PettyCash'        => 0,  // Will be updated below
                    'DepositedAmount'  => 0,
                    'TotalSales'       => 0,
                ]
            );

            // 4) Add the petty-cash-tomorrow from yesterday to today's petty
            $todayFlow->PettyCash += $tomorrowValue;
            $todayFlow->save();

            // 5) Optionally, you can reset or clear out yesterday’s petty tomorrow
            $flow->PettyCashTomorrow = 0;
            $flow->save();

            $this->info("Shifted PettyCashTomorrow = {$tomorrowValue} from [{$yesterday->toDateString()}, branch #{$flow->BranchID}] 
                         to [{$today->toDateString()}, branch #{$todayFlow->BranchID}]");
        }

        $this->info("PettyCashTomorrow shift complete!");
        return 0;
    }
}
