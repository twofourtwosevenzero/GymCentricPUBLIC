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
        Schema::create('attendances', function (Blueprint $table) {
            $table->id('AttendanceID');
            $table->unsignedBigInteger('StaffID');
            $table->unsignedBigInteger('PayrollID')->nullable();
            $table->date('Date');
            $table->time('TimeIn')->nullable();
            $table->time('TimeOut')->nullable();
            $table->decimal('HoursWorked', 5, 2)->default(0);
            $table->decimal('OvertimeHours', 5, 2)->default(0);
            $table->decimal('NightDiffHours', 5, 2)->default(0);
            $table->integer('LateMinutes')->default(0);
        
            $table->timestamps();
        
            $table->foreign('StaffID')->references('StaffID')->on('staff')->onDelete('cascade');
            $table->foreign('PayrollID')->references('PayrollID')->on('payrolls')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('attendances');
    }
};
