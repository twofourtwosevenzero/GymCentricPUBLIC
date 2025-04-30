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
        Schema::create('coaching_sessions', function (Blueprint $table) {
            $table->id('SessionID');
            $table->unsignedBigInteger('BranchID')->nullable();
            $table->foreign('BranchID')->references('BranchID')->on('branches');
    
            $table->string('SessionName');
            $table->string('SessionType')->nullable(); // e.g. "group class" or "personal training"
            $table->unsignedBigInteger('CoachID');
    
            // Store full date + time
            $table->dateTime('StartTime')->nullable();
            $table->dateTime('EndTime')->nullable();
    
            $table->unsignedInteger('Capacity')->default(1);
            $table->string('Location')->nullable();
            $table->decimal('Fee', 10, 2)->nullable();
    
            // ADD these two new columns to avoid "Unknown column" errors:
            $table->unsignedInteger('Participants')->default(0);
            $table->string('Status')->nullable();
    
            $table->timestamps();
    
            $table->foreign('CoachID')
                  ->references('CoachID')->on('coaches')
                  ->onDelete('cascade');
        });
    }
    

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('coaching_sessions');
    }
};
