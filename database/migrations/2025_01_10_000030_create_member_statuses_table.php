<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateMemberStatusesTable extends Migration
{
    public function up()
    {
        Schema::create('member_statuses', function (Blueprint $table) {
            $table->engine = 'InnoDB';
            $table->id('MemberStatusID'); 
            // or $table->bigIncrements('MemberStatusID');
            
            $table->string('StatusName')->unique();
            $table->timestamps();
        });
        
    }

    public function down()
    {
        Schema::dropIfExists('member_statuses');
    }
}
