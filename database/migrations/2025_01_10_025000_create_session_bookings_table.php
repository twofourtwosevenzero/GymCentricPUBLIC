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
        Schema::create('session_bookings', function (Blueprint $table) {
            $table->id('BookingID');
            $table->unsignedBigInteger('SessionID');
            $table->unsignedBigInteger('MemberID');
            $table->date('BookingDate');
            $table->unsignedBigInteger('PaymentID')->nullable();
            $table->string('Status')->default('Confirmed'); // "Confirmed", "Cancelled"
        
            $table->timestamps();
        
            $table->foreign('SessionID')->references('SessionID')->on('coaching_sessions')->onDelete('cascade');
            $table->foreign('MemberID')->references('MemberID')->on('members')->onDelete('cascade');
            $table->foreign('PaymentID')->references('PaymentID')->on('payments')->onDelete('set null');
        });
        
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('session_bookings');
    }
};
