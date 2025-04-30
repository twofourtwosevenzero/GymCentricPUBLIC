<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('coach_availabilities', function (Blueprint $table) {
            $table->id();
            
            // Link to the coaches table
            $table->unsignedBigInteger('CoachID');
            $table->foreign('CoachID')->references('CoachID')->on('coaches')->onDelete('cascade');
            
            // Each availability has a start and end datetime
            $table->dateTime('Start');
            $table->dateTime('End');
            
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('coach_availabilities');
    }
};
