<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('complexes_search', function (Blueprint $table) {
            $table->uuid('complex_id')->primary();
            
            // Основные данные
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            
            // Денормализованные справочники
            $table->string('district_id');
            $table->string('district_name'); // Денормализовано
            $table->string('builder_id')->nullable();
            $table->string('builder_name')->nullable(); // Денормализовано
            $table->string('subway_id')->nullable();
            $table->string('subway_name')->nullable(); // Денормализовано
            $table->string('subway_line')->nullable(); // Денормализовано
            $table->string('subway_distance')->nullable(); // "7 мин"
            
            // Геолокация
            $table->decimal('lat', 10, 7)->nullable();
            $table->decimal('lng', 10, 7)->nullable();
            $table->string('address')->nullable();
            
            // Статус и сроки
            $table->enum('status', ['building', 'completed', 'planned'])->default('building');
            $table->string('deadline')->nullable();
            
            // Агрегаты из apartments (обновляются триггерами)
            $table->unsignedBigInteger('price_from')->default(0);
            $table->unsignedBigInteger('price_to')->default(0);
            $table->integer('total_apartments')->default(0);
            $table->integer('available_apartments')->default(0);
            
            // Минимальные/максимальные значения для фильтрации
            $table->decimal('min_area', 10, 2)->nullable();
            $table->decimal('max_area', 10, 2)->nullable();
            $table->integer('min_floor')->nullable();
            $table->integer('max_floor')->nullable();
            
            // Boolean колонки для комнатности (вместо JSON)
            $table->boolean('rooms_0')->default(false); // Студия
            $table->boolean('rooms_1')->default(false); // 1 комната
            $table->boolean('rooms_2')->default(false); // 2 комнаты
            $table->boolean('rooms_3')->default(false); // 3 комнаты
            $table->boolean('rooms_4')->default(false); // 4+ комнаты
            
            // Boolean колонки для отделки
            $table->boolean('finishing_bez_otdelki')->default(false);
            $table->boolean('finishing_chernovaya')->default(false);
            $table->boolean('finishing_chistovaya')->default(false);
            $table->boolean('finishing_pod_klyuch')->default(false);
            
            // Медиа
            $table->json('images')->nullable();
            $table->json('advantages')->nullable();
            $table->json('infrastructure')->nullable();
            
            // Timestamps
            $table->timestamp('updated_at')->nullable();
            
            // Индексы (критично для производительности)
            $table->index('slug');
            $table->index('status');
            $table->index('district_id');
            $table->index('builder_id');
            $table->index('subway_id');
            $table->index(['price_from', 'price_to']);
            $table->index(['lat', 'lng']); // Spatial index для карты
            $table->index(['min_area', 'max_area']);
            $table->index(['min_floor', 'max_floor']);
            
            // Boolean индексы для комнатности
            $table->index('rooms_0');
            $table->index('rooms_1');
            $table->index('rooms_2');
            $table->index('rooms_3');
            $table->index('rooms_4');
            
            // Full-text search (MySQL 5.7+)
            $table->fullText(['name', 'district_name', 'subway_name', 'builder_name'], 'cs_fulltext_idx');
        });
        
        // Создать SPATIAL индекс для координат (если поддерживается)
        // Для MySQL 8.0+ можно использовать POINT тип, но для совместимости используем decimal
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('complexes_search');
    }
};
