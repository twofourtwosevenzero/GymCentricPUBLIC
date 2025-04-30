<?php

namespace App\Console;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;

class Kernel extends ConsoleKernel
{
    /**
     * Register the commands for the application.
     */
    protected $commands = [
        // If you want to explicitly register your command here
        \App\Console\Commands\ShiftPettyCash::class,
    ];

    /**
     * Define the application's command schedule.
     */
    protected function schedule(Schedule $schedule)
    {
        // Run petty:shift every day at 6 AM
        $schedule->command('petty:shift')->dailyAt('06:00');
    }

    /**
     * Register the Closure based commands for the application.
     */
    protected function scheduleCommands()
    {
        // (Optionally keep this empty, or define more schedules)
    }
}
