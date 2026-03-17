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
            $table->id();
            $table->foreignId('building_id')->constrained()->cascadeOnDelete();
            $table->string('source')->index();
            $table->string('external_id')->index();
            $table->string('number')->nullable();
            $table->integer('floor');
            $table->integer('floors');
            $table->unsignedBigInteger('price')->index();
            $table->decimal('area_total', 10, 2);
            $table->decimal('area_kitchen', 10, 2)->nullable();
            $table->decimal('area_rooms_total', 10, 2)->nullable();
            $table->decimal('area_balconies', 10, 2)->nullable();
            $table->integer('rooms_count')->index();
            $table->integer('wc_count')->nullable();
            $table->decimal('height', 4, 2)->nullable();
            $table->foreignId('finishing_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamps();
            
            $table->index('building_id');
            $table->unique(['source', 'external_id']);
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
