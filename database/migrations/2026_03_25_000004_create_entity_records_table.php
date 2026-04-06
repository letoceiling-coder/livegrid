<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('entity_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('entity_type_id')
                ->constrained('entity_types')
                ->cascadeOnDelete();
            $table->foreignId('created_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index('entity_type_id');
            $table->index('created_by');
            $table->index('deleted_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('entity_records');
    }
};
