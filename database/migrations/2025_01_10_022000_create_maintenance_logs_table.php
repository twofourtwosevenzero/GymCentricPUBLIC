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
        Schema::create('maintenance_logs', function (Blueprint $table) {
            $table->id('MaintenanceID');
            $table->unsignedBigInteger('EquipmentID');
            $table->date('MaintenanceDate');
            $table->string('IssueDescription')->nullable();
            $table->string('Resolution')->nullable();
            $table->unsignedBigInteger('MaintainedBy')->nullable(); // staff or vendor
            $table->date('NextMaintenanceDate')->nullable();
            $table->text('Notes')->nullable();
        
            $table->timestamps();
        
            $table->foreign('EquipmentID')->references('EquipmentID')->on('equipment')->onDelete('cascade');
            $table->foreign('MaintainedBy')->references('StaffID')->on('staff')->onDelete('set null');
        });
        
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('maintenance_logs');
    }
};
