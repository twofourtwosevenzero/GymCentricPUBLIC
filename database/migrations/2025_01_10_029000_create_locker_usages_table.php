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
        Schema::create('locker_usages', function (Blueprint $table) {
            $table->id('UsageID');
    
            $table->unsignedBigInteger('BranchID')->nullable(); 
            $table->foreign('BranchID')->references('BranchID')->on('branches');
    
            $table->unsignedBigInteger('LockerID');
            // Make MemberID nullable:
            $table->unsignedBigInteger('MemberID')->nullable(); 
    
            // (Optional) Add a column for storing walk-in occupant name:
            $table->string('WalkInName')->nullable();
    
            $table->boolean('KeyBorrowed')->default(true);
            $table->dateTime('BorrowDate');
            $table->dateTime('ReturnDate')->nullable();
            $table->boolean('Returned')->default(false);
            $table->text('Notes')->nullable();
    
            $table->timestamps();
    
            // Foreign keys
            $table->foreign('LockerID')
                  ->references('LockerID')->on('lockers')
                  ->onDelete('cascade');
            $table->foreign('MemberID')
                  ->references('MemberID')->on('members')
                  ->onDelete('cascade');
        });
    }
    
    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('locker_usages');
    }
};
