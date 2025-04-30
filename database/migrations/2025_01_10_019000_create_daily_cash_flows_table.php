<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dailycashflow', function (Blueprint $table) {
            $table->id('CashFlowID');
            $table->unsignedBigInteger('BranchID')->nullable();
            $table->foreign('BranchID')->references('BranchID')->on('branches');
            
            $table->date('Date');
            $table->string('BusinessType')->default('Gym');

            // Single columns for each method:
            $table->decimal('CashSales', 10, 2)->default(0);
            $table->decimal('GCashSales', 10, 2)->default(0);
            $table->decimal('BPISales', 10, 2)->default(0);
            $table->decimal('BDOSales', 10, 2)->default(0);

            $table->decimal('TotalSales', 10, 2)->default(0);

            // Petty / Deposited / Remarks
            $table->decimal('PettyCash', 10, 2)->default(0);
            $table->decimal('PettyCashTomorrow', 10, 2)->default(0);
            $table->decimal('DepositedAmount', 10, 2)->default(0);
            $table->text('Remarks')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        // Adjust your rollback as needed
        Schema::dropIfExists('dailycashflow');
    }
};
