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
        Schema::create('expenses', function (Blueprint $table) {
            $table->id('ExpenseID');
            $table->unsignedBigInteger('BranchID')->nullable(); 
            $table->foreign('BranchID')->references('BranchID')->on('branches');
    
            $table->dateTime('ExpenseDate')->nullable();
            $table->string('ExpenseCategory'); // "Utilities", "Marketing", "Repairs", etc.
            $table->decimal('Amount', 10, 2)->default(0);
            $table->string('PaymentMethod')->nullable();  // e.g., Cash, GCash, BPI
            $table->unsignedBigInteger('StaffID')->nullable();  // if a specific staff was responsible
            $table->text('Notes')->nullable();
    
            // NEW COLUMN:
            $table->string('BusinessType', 50)->nullable(); // "Gym", "Cafe", "Yogurt", etc.
    
            $table->timestamps();
    
            $table->foreign('StaffID')
                  ->references('StaffID')
                  ->on('staff')
                  ->onDelete('set null');
        });
    }
    
    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('expenses');
    }
};
