<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddCashAdvanceToPayrollsTable extends Migration
{
    public function up()
    {
        Schema::table('payrolls', function (Blueprint $table) {
            // Add a decimal or float column for the CashAdvance
            $table->decimal('CashAdvance', 10, 2)
                  ->default(0)
                  ->after('Deductions');  // Or place it wherever you prefer
        });
    }

    public function down()
    {
        Schema::table('payrolls', function (Blueprint $table) {
            $table->dropColumn('CashAdvance');
        });
    }
}
