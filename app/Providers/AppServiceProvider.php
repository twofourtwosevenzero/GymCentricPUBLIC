<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use App\Models\Payment;
use App\Observers\PaymentObserver;
use App\Console\Commands\ShiftPettyCash;
use App\Services\QrCodeService;
use App\Http\Controllers\QrCodeController;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Register your command so that "php artisan petty:shift" is recognized
        $this->app->singleton('command.petty.shift', function ($app) {
            return new ShiftPettyCash;
        });

        $this->commands([
            'command.petty.shift'
        ]);
        
        // Register QrCodeService as a singleton
        $this->app->singleton(QrCodeService::class, function ($app) {
            return new QrCodeService();
        });
        
        // Register QrCodeController explicitly
        $this->app->when(QrCodeController::class)
            ->needs(QrCodeService::class)
            ->give(function () {
                return app(QrCodeService::class);
            });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {   
        //-activity()->causedBy(
            // pick the first guard that is logged in, e.g. owner, then admin, then staff
        //   auth('owner')->user() ?? auth('admin')->user() ?? auth('staff')->user());
        Payment::observe(PaymentObserver::class);       
    }
}