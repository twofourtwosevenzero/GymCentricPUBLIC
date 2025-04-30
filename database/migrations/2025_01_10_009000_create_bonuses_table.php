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
        Schema::create('bonuses', function (Blueprint $table) {
            $table->id('BonusID');
            $table->unsignedBigInteger('StaffID');
            $table->decimal('BonusAmount', 10, 2)->default(0);
            $table->date('BonusDate');
            $table->string('Reason')->nullable();
        
            $table->timestamps();
        
            $table->foreign('StaffID')->references('StaffID')->on('staff')->onDelete('cascade');
        });
        
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bonuses');
    }
};
