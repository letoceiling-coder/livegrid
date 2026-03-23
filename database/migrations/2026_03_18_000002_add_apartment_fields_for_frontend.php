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
        Schema::table('apartments', function (Blueprint $table) {
            // Добавить недостающие поля
            if (!Schema::hasColumn('apartments', 'finishing_id')) {
                $table->string('finishing_id')->nullable()->after('builder_id');
            }
            if (!Schema::hasColumn('apartments', 'status')) {
                $table->enum('status', ['available', 'reserved', 'sold'])->default('available')->after('finishing_id');
            }
            if (!Schema::hasColumn('apartments', 'plan_image')) {
                $table->string('plan_image')->nullable()->after('status');
            }
            if (!Schema::hasColumn('apartments', 'section')) {
                $table->integer('section')->nullable()->after('plan_image');
            }
            
            // Индексы
            if (!$this->hasIndex('apartments', 'apartments_finishing_id_index')) {
                $table->index('finishing_id', 'apartments_finishing_id_index');
            }
            if (!$this->hasIndex('apartments', 'apartments_status_index')) {
                $table->index('status', 'apartments_status_index');
            }
            if (!$this->hasIndex('apartments', 'apartments_block_id_is_active_index')) {
                $table->index(['block_id', 'is_active'], 'apartments_block_id_is_active_index');
            }
            if (!$this->hasIndex('apartments', 'apartments_price_area_index')) {
                $table->index(['price', 'area_total'], 'apartments_price_area_index');
            }
            
            // Foreign key для finishing_id
            if (Schema::hasTable('finishings')) {
                $table->foreign('finishing_id')->references('id')->on('finishings')->nullOnDelete();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('apartments', function (Blueprint $table) {
            $table->dropForeign(['finishing_id']);
            $table->dropIndex('apartments_finishing_id_index');
            $table->dropIndex('apartments_status_index');
            $table->dropIndex('apartments_block_id_is_active_index');
            $table->dropIndex('apartments_price_area_index');
            
            $table->dropColumn([
                'finishing_id',
                'status',
                'plan_image',
                'section',
            ]);
        });
    }

    private function hasIndex(string $table, string $index): bool
    {
        $connection = Schema::getConnection();
        $doctrineSchemaManager = $connection->getDoctrineSchemaManager();
        $doctrineTable = $doctrineSchemaManager->listTableDetails($table);
        return $doctrineTable->hasIndex($index);
    }
};
