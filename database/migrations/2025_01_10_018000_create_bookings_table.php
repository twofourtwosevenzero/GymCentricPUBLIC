<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bookings', function (Blueprint $table) {
            $table->id('BookingID');

            // Columns
            $table->unsignedBigInteger('BranchID')->nullable();
            $table->unsignedBigInteger('MemberID')->nullable();
            $table->string('GuestName')->nullable();
            $table->string('GuestEmail')->nullable();

            $table->unsignedBigInteger('FacilityID');
            $table->unsignedBigInteger('PaymentID')->nullable();
            $table->date('BookingDate');
            $table->time('BookingTime');
            $table->integer('Duration')->nullable();

            $table->timestamps();

            // Foreign keys
            // Assuming your branches table has a PK named BranchID
            $table->foreign('BranchID')
                  ->references('BranchID')->on('branches')
                  ->onDelete('cascade'); 
                  // Or ->onDelete('set null') if you want

            // Assuming your members table has a PK named MemberID
            $table->foreign('MemberID')
                  ->references('MemberID')->on('members')
                  ->onDelete('cascade');

            // Assuming your facilities table has a PK named FacilityID
            $table->foreign('FacilityID')
                  ->references('FacilityID')->on('facilities')
                  ->onDelete('cascade');

            // Assuming your payments table has a PK named PaymentID
            $table->foreign('PaymentID')
                  ->references('PaymentID')->on('payments')
                  ->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bookings');
    }
};
