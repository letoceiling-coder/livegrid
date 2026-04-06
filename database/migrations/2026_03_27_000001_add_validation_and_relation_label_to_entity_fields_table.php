<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('entity_fields', function (Blueprint $table) {
            $table->string('relation_label_field', 100)
                ->nullable()
                ->after('relation_target_type')
                ->comment('Value code from target entity used as picker label (e.g. name)');
            $table->decimal('validation_min', 15, 4)
                ->nullable()
                ->after('relation_label_field')
                ->comment('Optional min for integer/float (inclusive)');
            $table->decimal('validation_max', 15, 4)
                ->nullable()
                ->after('validation_min')
                ->comment('Optional max for integer/float (inclusive)');
        });
    }

    public function down(): void
    {
        Schema::table('entity_fields', function (Blueprint $table) {
            $table->dropColumn(['relation_label_field', 'validation_min', 'validation_max']);
        });
    }
};
