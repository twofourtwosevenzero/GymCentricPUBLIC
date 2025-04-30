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
        Schema::create('session_attendances', function (Blueprint $table) {
            $table->id('AttendanceID');
            $table->unsignedBigInteger('SessionID');
            $table->unsignedBigInteger('MemberID');
            $table->date('AttendanceDate');
        
            $table->timestamps();
        
            $table->foreign('SessionID')->references('SessionID')->on('coaching_sessions')->onDelete('cascade');
            $table->foreign('MemberID')->references('MemberID')->on('members')->onDelete('cascade');
        });
        
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('session_attendances');
    }
};
