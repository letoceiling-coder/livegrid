<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('entity_values', function (Blueprint $table) {
            $table->id();
            $table->foreignId('entity_record_id')
                ->constrained('entity_records')
                ->cascadeOnDelete();
            $table->foreignId('entity_field_id')
                ->constrained('entity_fields')
                ->cascadeOnDelete();

            // Typed value columns — no JSON
            $table->string('value_string', 1000)->nullable();
            $table->bigInteger('value_integer')->nullable();
            $table->decimal('value_float', 15, 4)->nullable();
            $table->boolean('value_boolean')->nullable();
            $table->date('value_date')->nullable();
            $table->dateTime('value_datetime')->nullable();

            $table->unique(['entity_record_id', 'entity_field_id'], 'ev_record_field_unique');
            $table->index('entity_field_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('entity_values');
    }
};
