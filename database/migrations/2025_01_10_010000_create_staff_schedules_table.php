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
        Schema::create('staff_schedules', function (Blueprint $table) {
            $table->id('ScheduleID');
            $table->unsignedBigInteger('StaffID');
            $table->date('ShiftDate');
            $table->time('ShiftStart')->nullable();
            $table->time('ShiftEnd')->nullable();
            $table->string('ShiftType', 20)->nullable();
            $table->string('RoleOverride')->nullable();
        
            $table->timestamps();
        
            $table->foreign('StaffID')->references('StaffID')->on('staff')->onDelete('cascade');
        });
        
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('staff_schedules');
    }
};
