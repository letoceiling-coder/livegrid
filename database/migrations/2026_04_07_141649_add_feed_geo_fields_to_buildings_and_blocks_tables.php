<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('buildings', function (Blueprint $table) {
            if (! Schema::hasColumn('buildings', 'address')) {
                $table->string('address')->nullable()->after('name');
            }
            if (! Schema::hasColumn('buildings', 'lat')) {
                $table->decimal('lat', 10, 7)->nullable()->after('address');
            }
            if (! Schema::hasColumn('buildings', 'lng')) {
                $table->decimal('lng', 10, 7)->nullable()->after('lat');
            }
            if (! Schema::hasColumn('buildings', 'queue')) {
                $table->string('queue')->nullable()->after('lng');
            }
        });

        Schema::table('blocks', function (Blueprint $table) {
            if (! Schema::hasColumn('blocks', 'crm_id')) {
                $table->string('crm_id')->nullable()->after('external_id');
            }
            if (! Schema::hasColumn('blocks', 'plan')) {
                $table->json('plan')->nullable()->after('images');
            }
            if (! Schema::hasColumn('blocks', 'renderer')) {
                $table->json('renderer')->nullable()->after('plan');
            }
        });
    }

    public function down(): void
    {
        Schema::table('buildings', function (Blueprint $table) {
            foreach (['queue', 'lng', 'lat', 'address'] as $col) {
                if (Schema::hasColumn('buildings', $col)) {
                    $table->dropColumn($col);
                }
            }
        });

        Schema::table('blocks', function (Blueprint $table) {
            foreach (['renderer', 'plan', 'crm_id'] as $col) {
                if (Schema::hasColumn('blocks', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
