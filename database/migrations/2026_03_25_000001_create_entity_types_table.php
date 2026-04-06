<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('entity_types', function (Blueprint $table) {
            $table->id();
            $table->string('code', 100)->unique()->comment('Machine name: apartment, complex, deal');
            $table->string('name', 255)->comment('Display name: Квартира');
            $table->string('icon', 100)->nullable()->comment('Icon name e.g. home, building');
            $table->boolean('is_active')->default(true);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index('is_active');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('entity_types');
    }
};
