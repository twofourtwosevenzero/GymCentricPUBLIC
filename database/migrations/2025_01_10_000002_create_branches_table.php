<?php

// 2025_01_20_000000_create_branches_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('branches', function (Blueprint $table) {
            $table->id('BranchID');
            $table->string('BranchName');
            $table->string('Location')->nullable();
            $table->string('Status', 50)->nullable()->default('Active');
            $table->string('Contact', 255)->nullable();            
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('branches');
    }
};
