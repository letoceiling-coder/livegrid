<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('entity_field_options', function (Blueprint $table) {
            $table->id();
            $table->foreignId('entity_field_id')
                ->constrained('entity_fields')
                ->cascadeOnDelete();
            $table->string('value', 255)->comment('Stored value');
            $table->string('label', 255)->comment('Display label');
            $table->unsignedSmallInteger('sort_order')->default(0);

            $table->unique(['entity_field_id', 'value']);
            $table->index('entity_field_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('entity_field_options');
    }
};
