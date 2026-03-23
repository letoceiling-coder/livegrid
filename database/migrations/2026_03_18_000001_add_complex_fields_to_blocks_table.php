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
        // Nullify empty slugs before adding unique constraint
        \DB::statement("UPDATE blocks SET slug = NULL WHERE slug = '' OR slug IS NULL");

        Schema::table('blocks', function (Blueprint $table) {
            // Добавить недостающие поля для frontend
            if (!Schema::hasColumn('blocks', 'slug')) {
                $table->string('slug')->nullable()->after('name');
            }
            if (!Schema::hasColumn('blocks', 'description')) {
                $table->text('description')->nullable()->after('slug');
            }
            if (!Schema::hasColumn('blocks', 'address')) {
                $table->string('address')->nullable()->after('lng');
            }
            if (!Schema::hasColumn('blocks', 'status')) {
                $table->enum('status', ['building', 'completed', 'planned'])->default('building')->after('address');
            }
            if (!Schema::hasColumn('blocks', 'deadline')) {
                $table->string('deadline')->nullable()->after('status'); // Строка, не дата
            }
            if (!Schema::hasColumn('blocks', 'images')) {
                $table->json('images')->nullable()->after('deadline');
            }
            if (!Schema::hasColumn('blocks', 'advantages')) {
                $table->json('advantages')->nullable()->after('images');
            }
            if (!Schema::hasColumn('blocks', 'infrastructure')) {
                $table->json('infrastructure')->nullable()->after('advantages');
            }
            
            // Индексы
            if (!$this->hasIndex('blocks', 'blocks_slug_index')) {
                $table->index('slug', 'blocks_slug_index');
            }
            if (!$this->hasIndex('blocks', 'blocks_status_index')) {
                $table->index('status', 'blocks_status_index');
            }
            if (!$this->hasIndex('blocks', 'blocks_lat_lng_index')) {
                $table->index(['lat', 'lng'], 'blocks_lat_lng_index');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('blocks', function (Blueprint $table) {
            $table->dropIndex('blocks_slug_index');
            $table->dropIndex('blocks_status_index');
            $table->dropIndex('blocks_lat_lng_index');
            
            $table->dropColumn([
                'slug',
                'description',
                'address',
                'status',
                'deadline',
                'images',
                'advantages',
                'infrastructure',
            ]);
        });
    }

    private function hasIndex(string $table, string $index): bool
    {
        $results = \DB::select("SHOW INDEX FROM `{$table}` WHERE Key_name = ?", [$index]);
        return !empty($results);
    }
};
