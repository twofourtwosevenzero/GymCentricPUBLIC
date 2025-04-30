<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateMonthlyClientAttendancesTable extends Migration
{
    public function up()
    {
Schema::create('monthly_client_attendances', function (Blueprint $table) {
    $table->engine = 'InnoDB';
    $table->increments('MonthlyClientAttendanceID');
    $table->unsignedInteger('MonthlyClientID');
    $table->dateTime('VisitDateTime');
    $table->string('Notes', 255)->nullable();
    $table->timestamps();

    $table->foreign('MonthlyClientID')
          ->references('MonthlyClientID')
          ->on('monthly_clients')
          ->onDelete('cascade');
});
    }

    public function down()
    {
        Schema::dropIfExists('monthly_client_attendances');
    }
}
