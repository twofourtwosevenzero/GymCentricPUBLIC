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
        Schema::create('membership_renewals', function (Blueprint $table) {
            $table->id('RenewalID');
            $table->unsignedBigInteger('MemberID');
            $table->date('RenewalDate');
            $table->unsignedBigInteger('PlanID');
            $table->decimal('RenewalAmount', 10, 2);
        
            $table->timestamps();
        
            $table->foreign('MemberID')->references('MemberID')->on('members')->onDelete('cascade');
            $table->foreign('PlanID')->references('PlanID')->on('membership_plans')->onDelete('cascade');
        });
        
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('membership_renewals');
    }
};
