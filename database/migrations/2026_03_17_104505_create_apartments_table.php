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
        Schema::create('apartments', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('source_id')->constrained()->cascadeOnDelete();
            $table->string('building_id');
            $table->string('block_id');
            $table->string('builder_id')->nullable();
            $table->unsignedBigInteger('price')->index();
            $table->integer('rooms_count')->index();
            $table->integer('floor');
            $table->integer('floors');
            $table->decimal('area_total', 10, 2);
            $table->decimal('area_kitchen', 10, 2)->nullable();
            $table->decimal('area_rooms_total', 10, 2)->nullable();
            $table->decimal('area_balconies', 10, 2)->nullable();
            $table->decimal('lat', 10, 7)->nullable();
            $table->decimal('lng', 10, 7)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamp('last_seen_at')->nullable();
            
            // Denormalized fields for frontend
            $table->string('block_name');
            $table->string('builder_name');
            $table->string('district_name');
            
            $table->timestamps();
            
            $table->foreign('building_id')->references('id')->on('buildings')->cascadeOnDelete();
            $table->foreign('block_id')->references('id')->on('blocks')->cascadeOnDelete();
            $table->foreign('builder_id')->references('id')->on('builders')->nullOnDelete();
            $table->index('building_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('apartments');
    }
};
