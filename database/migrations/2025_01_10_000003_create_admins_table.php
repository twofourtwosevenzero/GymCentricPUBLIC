<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1) Create the 'admins' table WITHOUT the BranchID column
        Schema::create('admins', function (Blueprint $table) {
            $table->id('AdminID');  // or just use $table->id(); for an 'id' column
            $table->string('FullName');
            $table->string('Role')->default('Admin');
            $table->string('Email')->unique()->nullable();
            $table->string('password')->nullable();
            $table->rememberToken()->nullable();
            $table->timestamps();
        });

        // 2) Create a pivot table 'admin_branch' for many-to-many assignment
        Schema::create('admin_branch', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('BranchID');
            $table->unsignedBigInteger('AdminID');
            $table->timestamps();

            $table->foreign('BranchID')
                ->references('BranchID')
                ->on('branches')
                ->onDelete('cascade');

            $table->foreign('AdminID')
                ->references('AdminID')
                ->on('admins')
                ->onDelete('cascade');

            // Optional: ensure each (BranchID,AdminID) pair is unique
            $table->unique(['BranchID','AdminID']);        
    });
    }

    public function down(): void
    {
        Schema::dropIfExists('admins');
    }
};
