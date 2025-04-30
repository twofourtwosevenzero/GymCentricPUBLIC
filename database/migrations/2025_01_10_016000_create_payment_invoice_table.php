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
        Schema::create('PaymentInvoices', function (Blueprint $table) {
            $table->id('PaymentInvoiceID');
            $table->unsignedBigInteger('PaymentID');
            $table->unsignedBigInteger('InvoiceID');
            $table->decimal('AmountAllocated', 10, 2)->default(0);
        
            $table->timestamps();
        
            $table->foreign('PaymentID')->references('PaymentID')->on('payments')->onDelete('cascade');
            $table->foreign('InvoiceID')->references('InvoiceID')->on('invoices')->onDelete('cascade');
        });
        
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('PaymentInvoices');
    }
};
