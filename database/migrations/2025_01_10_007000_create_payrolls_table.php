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
        Schema::create('payrolls', function (Blueprint $table) {
            $table->id('PayrollID');
            $table->unsignedBigInteger('StaffID');
            $table->date('StartDate');
            $table->date('EndDate');
            $table->decimal('GrossPay', 10, 2)->default(0);
            $table->decimal('Deductions', 10, 2)->default(0);
            $table->decimal('NetPay', 10, 2)->default(0);
            $table->date('GeneratedDate')->nullable();
            $table->string('Status')->default('Pending'); // "Pending", "Paid"
        
            $table->timestamps();
        
            $table->foreign('StaffID')->references('StaffID')->on('staff')->onDelete('cascade');
        });
        
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payrolls');
    }
};
