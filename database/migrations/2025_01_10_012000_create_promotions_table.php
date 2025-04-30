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
        Schema::create('promotions', function (Blueprint $table) {
            $table->id('PromotionID');
            $table->string('Name');
            $table->string('DiscountType')->default('Percentage'); // or "FixedAmount"
            $table->decimal('DiscountValue', 10, 2)->default(0);
            $table->date('StartDate')->nullable();
            $table->date('EndDate')->nullable();
            $table->text('TermsAndConditions')->nullable();
            $table->string('Status')->default('Active'); // "Active", "Expired", "Scheduled"
        
            $table->timestamps();
        });
        
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('promotions');
    }
};
