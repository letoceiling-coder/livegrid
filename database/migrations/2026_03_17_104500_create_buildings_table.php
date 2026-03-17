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
        Schema::create('buildings', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('block_id');
            $table->string('building_type_id')->nullable();
            $table->string('name');
            $table->date('deadline')->nullable();
            $table->timestamp('created_at')->nullable();
            
            $table->foreign('block_id')->references('id')->on('blocks')->cascadeOnDelete();
            $table->foreign('building_type_id')->references('id')->on('building_types')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('buildings');
    }
};
