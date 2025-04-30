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
        Schema::create('member_visits', function (Blueprint $table) {
            $table->id('VisitID');
            $table->unsignedBigInteger('BranchID');
            $table->foreign('BranchID')->references('BranchID')->on('branches');
            $table->unsignedBigInteger('MemberID');
            $table->date('VisitDate');
            $table->unique(['MemberID', 'BranchID', 'VisitDate'], 'uniq_member_visit');
            $table->time('VisitTime');
            $table->string('CheckInMethod')->nullable(); // "Biometric", "Card"
            $table->text('Remarks')->nullable();
        
            $table->timestamps();
        
            $table->foreign('MemberID')->references('MemberID')->on('members')->onDelete('cascade');

        });
        
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('member_visit');
    }
};