<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('membership_renewals', function (Blueprint $table) {
            $table->date('RenewalStartDate')->nullable()->after('PlanID');
        });
    }

    public function down(): void
    {
        Schema::table('membership_renewals', function (Blueprint $table) {
            $table->dropColumn('RenewalStartDate');
        });
    }
};
