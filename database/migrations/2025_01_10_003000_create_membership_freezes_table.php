<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('membership_freezes', function (Blueprint $table) {
            $table->id('FreezeID'); 
            $table->unsignedBigInteger('MemberID'); 
            $table->unsignedBigInteger('StartedBranchID')->nullable(); 
            $table->date('FreezeStartDate')->nullable();
            $table->date('FreezeEndDate')->nullable();
            $table->string('Reason')->nullable();
            $table->date('OriginalEndDate')->nullable();
            $table->timestamps();

            // ✅ Add foreign keys after defining columns
            $table->foreign('MemberID')->references('MemberID')->on('members')->onDelete('cascade');
            $table->foreign('StartedBranchID')->references('BranchID')->on('branches')->onDelete('set null'); 
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('membership_freezes');
    }
};
