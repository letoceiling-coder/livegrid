<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('entity_relations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('entity_record_id')
                ->constrained('entity_records')
                ->cascadeOnDelete();
            $table->foreignId('related_record_id')
                ->constrained('entity_records')
                ->cascadeOnDelete();
            $table->string('relation_type', 100)->default('linked')
                ->comment('parent, child, linked, etc.');
            $table->timestamp('created_at')->useCurrent();

            $table->unique(
                ['entity_record_id', 'related_record_id', 'relation_type'],
                'er_record_related_type_unique'
            );
            $table->index('related_record_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('entity_relations');
    }
};
