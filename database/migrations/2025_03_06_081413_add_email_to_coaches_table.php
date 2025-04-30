<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up()
    {
        Schema::table('coaches', function (Blueprint $table) {
            // Add a nullable Email column, e.g. after 'ContactInfo'
            $table->string('Email', 255)->nullable()->after('ContactInfo');
        });
    }

    public function down()
    {
        Schema::table('coaches', function (Blueprint $table) {
            $table->dropColumn('Email');
        });
    }
};
