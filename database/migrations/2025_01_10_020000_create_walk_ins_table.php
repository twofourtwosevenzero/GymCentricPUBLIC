<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('walk_ins', function (Blueprint $table) {
            $table->id('WalkInID');

            // Branch
            $table->unsignedBigInteger('BranchID')->nullable();
            $table->foreign('BranchID')
                  ->references('BranchID')
                  ->on('branches');

            // Payment
            $table->unsignedBigInteger('PaymentID')->nullable();
            $table->foreign('PaymentID')
                  ->references('PaymentID') 
                  ->on('payments')
                  ->onDelete('cascade');

            // Other columns
            $table->string('FullName')->nullable();
            $table->dateTime('VisitDate')->nullable();
            $table->text('Notes')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('walk_ins');
    }
};