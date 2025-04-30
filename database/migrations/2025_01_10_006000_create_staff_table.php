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
        // 1) Create the 'staff' table WITHOUT the BranchID column
        Schema::create('staff', function (Blueprint $table) {
            $table->id('StaffID');
            $table->string('FullName');
            $table->string('Role')->default('Staff');
            $table->string('Email')->unique()->nullable();
            $table->string('password')->nullable();
            $table->rememberToken()->nullable();
            $table->string('Phone')->nullable();
            $table->decimal('DailyRate', 10, 2)->nullable();
            $table->decimal('HourlyRate', 10, 2)->nullable();
            $table->decimal('OvertimeRate', 10, 2)->nullable();
            $table->date('DateHired')->nullable();
            $table->text('Notes')->nullable();
            $table->timestamps();
        });

        // 2) Create a pivot table 'branch_staff' for many-to-many assignment
        Schema::create('branch_staff', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('BranchID');
            $table->unsignedBigInteger('StaffID');
            $table->timestamps();

            $table->foreign('BranchID')->references('BranchID')->on('branches')->onDelete('cascade');
            $table->foreign('StaffID')->references('StaffID')->on('staff')->onDelete('cascade');

            // If each (BranchID,StaffID) pair should be unique:
            $table->unique(['BranchID','StaffID']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Drop pivot table first due to FK dependencies
        Schema::dropIfExists('branch_staff');
        Schema::dropIfExists('staff');
    }
};
