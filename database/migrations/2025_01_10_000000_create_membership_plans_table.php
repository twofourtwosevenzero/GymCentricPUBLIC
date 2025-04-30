<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('membership_plans', function (Blueprint $table) {
            $table->id('PlanID');
            $table->string('PlanName');
            $table->decimal('Price', 10, 2);
            $table->integer('Duration');   // store, e.g., 30 for 30 days
            // "LockInMonths" => 3 means locked for 3 months
             $table->integer('LockInMonths')->nullable();
            // Possibly "BillingMode" => "half-month" or "fixed-days" 
            // if you have different billing modes for different plans
             $table->string('BillingMode')->nullable(); 
          
            $table->timestamps();
          });          
        
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('membership_plans');
    }
};
