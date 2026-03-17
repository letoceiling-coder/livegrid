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
        Schema::create('apartment_attributes', function (Blueprint $table) {
            $table->id();
            $table->string('apartment_id');
            $table->foreignId('attribute_id')->constrained()->cascadeOnDelete();
            $table->bigInteger('value_int')->nullable();
            $table->decimal('value_float', 10, 2)->nullable();
            $table->string('value_string')->nullable();
            $table->boolean('value_bool')->nullable();
            $table->json('value_json')->nullable();
            $table->timestamps();
            
            $table->foreign('apartment_id')->references('id')->on('apartments')->cascadeOnDelete();
            $table->index('attribute_id');
            $table->index('apartment_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('apartment_attributes');
    }
};
