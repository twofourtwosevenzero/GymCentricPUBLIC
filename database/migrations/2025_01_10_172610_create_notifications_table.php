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
        Schema::create('notifications', function (Blueprint $table) {
            $table->id('NotificationID');
            $table->unsignedBigInteger('MemberID')->nullable();
            $table->string('EventTrigger')->nullable();      // e.g., "Membership Renewal"
            $table->string('Subject')->nullable();             // New column for subject
            $table->string('Sender')->nullable();              // New column for sender
            $table->text('Message')->nullable();
            $table->string('NotificationMethod')->nullable(); // "Email", "SMS"
            $table->dateTime('SentDate')->nullable();
            $table->string('Status')->default('Pending');       // "Sent", "Pending", "Failed"
        
            $table->timestamps();
        
            $table->foreign('MemberID')->references('MemberID')->on('members')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};
