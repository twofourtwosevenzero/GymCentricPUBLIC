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
        Schema::create('invoice_line_items', function (Blueprint $table) {
            $table->id('LineItemID');
            $table->unsignedBigInteger('InvoiceID');
            $table->string('ItemType')->nullable(); // "Membership", "PersonalTraining", "Product", etc.
            $table->unsignedBigInteger('ItemID')->nullable(); 
            $table->text('Description')->nullable();
            $table->unsignedInteger('Quantity')->default(1);
            $table->decimal('UnitPrice', 10, 2)->default(0);
            $table->decimal('Subtotal', 10, 2)->default(0);
        
            $table->timestamps();
        
            $table->foreign('InvoiceID')->references('InvoiceID')->on('invoices')->onDelete('cascade');
        });
        
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('invoice_line_items');
    }
};
