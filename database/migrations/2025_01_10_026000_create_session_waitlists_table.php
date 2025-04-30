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
        Schema::create('session_waitlists', function (Blueprint $table) {
            $table->id('WaitlistID');
            $table->unsignedBigInteger('SessionID');
            $table->unsignedBigInteger('MemberID');
            $table->dateTime('WaitlistDate')->nullable();
            $table->string('Status')->default('Waiting'); // "Waiting", "Confirmed", "Cancelled"
        
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
        Schema::dropIfExists('session_waitlists');
    }
};
