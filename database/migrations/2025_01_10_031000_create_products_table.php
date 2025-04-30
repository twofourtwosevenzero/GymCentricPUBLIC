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
        Schema::create('products', function (Blueprint $table) {
            $table->id('ProductID');
            $table->unsignedBigInteger('BranchID')->nullable(); 
            $table->foreign('BranchID')->references('BranchID')->on('branches');
            $table->string('ProductName');
            $table->string('Category')->nullable(); // e.g., "Consumable", "Retail"
            $table->unsignedInteger('StockLevel')->default(0);
            $table->unsignedInteger('ReorderLevel')->nullable();
            $table->string('UnitOfMeasure')->nullable();
            $table->decimal('Cost', 10, 2)->nullable();
            $table->decimal('Price', 10, 2)->nullable();
            $table->text('Notes')->nullable();
        
            $table->timestamps();
        });
        
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
