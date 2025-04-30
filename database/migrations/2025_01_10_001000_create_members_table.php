<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateMembersTable extends Migration
{
    public function up()
    {
        Schema::create('members', function (Blueprint $table) {
            $table->bigIncrements('MemberID');
            $table->string('FullName');
            $table->string('Email')->nullable();
            $table->string('Phone')->nullable();
            $table->unsignedBigInteger('PlanID')->nullable();
            $table->string('MembershipCardNumber')->nullable()->unique();
            $table->boolean('MembershipCardIssued')->default(false);
            $table->date('MembershipStartDate')->nullable();
            $table->date('MembershipEndDate')->nullable();
            $table->date('LockedInEndDate')->nullable();
    
            // WebAuthn credentials
            $table->json('Biometrics')->nullable();          // full credential data
            $table->json('CredentialIds')->nullable();       // IDs for quick lookup
    
            $table->string('PhotoPath')->nullable();
            $table->integer('FreeSessions')->default(0);
            $table->text('Notes')->nullable();
            $table->unsignedBigInteger('StartedBranchID');
            $table->unsignedBigInteger('BranchID')->nullable();
            $table->unsignedBigInteger('MemberStatusID')->nullable();
            $table->timestamps();
    
            // Foreign keys
            $table->foreign('StartedBranchID')->references('BranchID')->on('branches')->onDelete('cascade');
            $table->foreign('BranchID')->references('BranchID')->on('branches')->onDelete('set null');
        });
    }
    
    public function down()
    {
        Schema::dropIfExists('members');
    }
}
