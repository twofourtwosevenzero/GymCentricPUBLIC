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
        Schema::create('coaches', function (Blueprint $table) {
            $table->id('CoachID');
            $table->unsignedBigInteger('BranchID')->nullable();
            $table->foreign('BranchID')->references('BranchID')->on('branches');
        
            $table->string('FullName');
            $table->string('Specialty')->nullable();
        
            // Two datetime columns for start–end range
            $table->dateTime('AvailabilityStart')->nullable();
            $table->dateTime('AvailabilityEnd')->nullable();
        
            $table->string('ContactInfo')->nullable();
        
            $table->timestamps();
        });
        
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('coaches');
    }
};
