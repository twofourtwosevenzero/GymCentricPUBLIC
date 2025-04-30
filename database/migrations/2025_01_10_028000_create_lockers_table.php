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
        Schema::create('lockers', function (Blueprint $table) {
            $table->id('LockerID');
            $table->unsignedBigInteger('BranchID')->nullable(); 
            $table->foreign('BranchID')->references('BranchID')->on('branches');
            $table->string('LockerNumber', 50);
             $table->unique(['BranchID', 'LockerNumber'], 'unique_locker_per_branch');
            $table->string('Status')->default('Available'); // "Available", "Occupied", "OutOfService"
            $table->text('Notes')->nullable();
        
            $table->timestamps();
        });
        
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('lockers');
    }
};
