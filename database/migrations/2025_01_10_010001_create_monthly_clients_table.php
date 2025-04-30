<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateMonthlyClientsTable extends Migration
{
    public function up()
    {
        Schema::create('monthly_clients', function (Blueprint $table) {
            $table->engine = 'InnoDB';
            $table->increments('MonthlyClientID');
            $table->unsignedInteger('BranchID')->nullable();
            $table->string('FullName', 255);
            $table->string('Email')->unique();
            $table->string('Phone', 50)->nullable();
            $table->date('StartDate')->nullable();
            $table->date('EndDate')->nullable();
            $table->boolean('IsActive')->default(true);
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('monthly_clients');
    }
}
