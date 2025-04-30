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
        Schema::create('membership_change_logs', function (Blueprint $table) {
            $table->id('ChangeID');
            $table->unsignedBigInteger('MemberID');
            $table->unsignedBigInteger('OldPlanID')->nullable();
            $table->unsignedBigInteger('NewPlanID')->nullable();
            $table->date('ChangeDate')->nullable();
            $table->string('Reason')->nullable();
            $table->text('Notes')->nullable();
        
            $table->timestamps();
        
            $table->foreign('MemberID')->references('MemberID')->on('members')->onDelete('cascade');
            $table->foreign('OldPlanID')->references('PlanID')->on('membership_plans')->onDelete('set null');
            $table->foreign('NewPlanID')->references('PlanID')->on('membership_plans')->onDelete('set null');
        });
        
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('membership_change_logs');
    }
};
