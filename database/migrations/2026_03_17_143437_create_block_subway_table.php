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
        Schema::create('block_subway', function (Blueprint $table) {
            $table->string('block_id');
            $table->string('subway_id');
            $table->integer('distance_time');
            $table->tinyInteger('distance_type');
            
            $table->primary(['block_id', 'subway_id']);
            $table->foreign('block_id')->references('id')->on('blocks')->cascadeOnDelete();
            $table->foreign('subway_id')->references('id')->on('subways')->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('block_subway');
    }
};
