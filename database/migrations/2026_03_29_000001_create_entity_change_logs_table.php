<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('entity_change_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('entity_record_id')
                ->nullable()
                ->constrained('entity_records')
                ->nullOnDelete();
            $table->string('entity_type_code', 100)->index();
            $table->string('action', 32)->index();
            $table->foreignId('user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->json('diff')->nullable();
            $table->timestamps();

            $table->index(['entity_type_code', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('entity_change_logs');
    }
};
