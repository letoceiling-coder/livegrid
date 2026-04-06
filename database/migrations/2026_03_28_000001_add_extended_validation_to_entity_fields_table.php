<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('entity_fields', function (Blueprint $table) {
            $table->string('validation_pattern', 500)
                ->nullable()
                ->after('validation_max')
                ->comment('PCRE, e.g. /^[a-z]+$/i');
            $table->unsignedSmallInteger('validation_min_length')
                ->nullable()
                ->after('validation_pattern');
            $table->unsignedSmallInteger('validation_max_length')
                ->nullable()
                ->after('validation_min_length');
            $table->json('validation_enum')
                ->nullable()
                ->after('validation_max_length')
                ->comment('Allowed scalar values as JSON array');
        });
    }

    public function down(): void
    {
        Schema::table('entity_fields', function (Blueprint $table) {
            $table->dropColumn([
                'validation_pattern',
                'validation_min_length',
                'validation_max_length',
                'validation_enum',
            ]);
        });
    }
};
