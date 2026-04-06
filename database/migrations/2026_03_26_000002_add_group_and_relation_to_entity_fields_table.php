<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('entity_fields', function (Blueprint $table) {
            $table->string('group', 191)->nullable()->after('name')->comment('CRM UI section: Основное, Локация');
            $table->string('relation_target_type', 100)
                ->nullable()
                ->after('sort_order')
                ->comment('Target entity_types.code for async relation picker (optional)');
        });
    }

    public function down(): void
    {
        Schema::table('entity_fields', function (Blueprint $table) {
            $table->dropColumn(['group', 'relation_target_type']);
        });
    }
};
