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
        Schema::create('facilities', function (Blueprint $table) {
            $table->id('FacilityID');
            $table->unsignedBigInteger('BranchID')->nullable();
            $table->string('FacilityName');
            $table->text('Description')->nullable();
            $table->string('Status')->default('Available'); 
            // e.g. "Available", "Under Maintenance", "Closed"
    
            $table->timestamps();
    
            // If a facility belongs to a single branch
            $table->foreign('BranchID')
                  ->references('BranchID')
                  ->on('branches')
                  ->onDelete('set null');
        });
        
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('facilities');
    }
};
