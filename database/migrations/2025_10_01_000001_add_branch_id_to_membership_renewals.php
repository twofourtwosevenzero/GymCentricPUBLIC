<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddBranchIdToMembershipRenewals extends Migration
{
    public function up()
    {
        Schema::table('membership_renewals', function (Blueprint $table) {
            $table->unsignedBigInteger('BranchID')->nullable()->after('PlanID');
            $table->foreign('BranchID')
                  ->references('BranchID')->on('branches')
                  ->onDelete('cascade');
        });
    }

    public function down()
    {
        Schema::table('membership_renewals', function (Blueprint $table) {
            $table->dropForeign(['BranchID']);
            $table->dropColumn('BranchID');
        });
    }
}
