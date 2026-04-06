<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('entity_fields', function (Blueprint $table) {
            $table->id();
            $table->foreignId('entity_type_id')
                ->constrained('entity_types')
                ->cascadeOnDelete();
            $table->string('code', 100)->comment('Machine name: price, area, status');
            $table->string('name', 255)->comment('Display name: Цена');
            $table->enum('type', [
                'string',
                'integer',
                'float',
                'boolean',
                'date',
                'datetime',
                'text',
                'select',
                'multi_select',
            ])->default('string');
            $table->boolean('is_required')->default(false);
            $table->boolean('is_filterable')->default(false);
            $table->boolean('is_searchable')->default(false);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();

            $table->unique(['entity_type_id', 'code']);
            $table->index('type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('entity_fields');
    }
};
