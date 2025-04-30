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
        Schema::create('system_logs', function (Blueprint $table) {
            $table->id('LogID');
            $table->unsignedBigInteger('BranchID')->nullable(); 
            $table->foreign('BranchID')->references('BranchID')->on('branches');
            $table->unsignedBigInteger('UserID')->nullable(); // references Staff or system user
            $table->string('Action');
            $table->dateTime('Timestamp');
            $table->string('IPAddress')->nullable();
            $table->json('Details')->nullable();  // or text
        
            $table->timestamps();
        
            $table->foreign('UserID')->references('StaffID')->on('staff')->onDelete('set null');
        });
        
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('system_logs');
    }
};
