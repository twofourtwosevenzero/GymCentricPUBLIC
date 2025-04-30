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
        Schema::create('staff_tasks', function (Blueprint $table) {
            $table->id('TaskID');
            $table->unsignedBigInteger('StaffID');
            $table->text('TaskDescription');
            $table->date('TaskDate')->nullable();
            $table->string('Status')->default('Pending'); // "Pending", "Completed"
        
            $table->timestamps();
        
            $table->foreign('StaffID')->references('StaffID')->on('staff')->onDelete('cascade');
        });
        
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('staff_tasks');
    }
};
