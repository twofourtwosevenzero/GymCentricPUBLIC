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
        Schema::create('product_inventory_logs', function (Blueprint $table) {
            $table->id('InventoryLogID');
            $table->unsignedBigInteger('BranchID')->nullable(); 
            $table->foreign('BranchID')->references('BranchID')->on('branches');
            $table->unsignedBigInteger('ProductID');
            $table->dateTime('ChangeDate');
            $table->string('ChangeType')->nullable(); // "Purchase", "Usage", "Disposal", "Correction"
            $table->integer('QuantityChange');
            $table->integer('NewStockLevel');
            $table->unsignedBigInteger('StaffID')->nullable(); // accountability
            $table->text('Notes')->nullable();
        
            $table->timestamps();
        
            $table->foreign('ProductID')->references('ProductID')->on('products')->onDelete('cascade');
            $table->foreign('StaffID')->references('StaffID')->on('staff')->onDelete('set null');
        });
        
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('product_inventory_logs');
    }
};
