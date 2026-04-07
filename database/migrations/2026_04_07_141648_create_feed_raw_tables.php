<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        foreach (['feed_blocks_raw', 'feed_buildings_raw', 'feed_apartments_raw'] as $tableName) {
            if (Schema::hasTable($tableName)) {
                continue;
            }

            Schema::create($tableName, function (Blueprint $table) {
                $table->id();
                $table->string('external_id')->unique();
                $table->json('payload');
                $table->timestamp('exported_at')->nullable();
                $table->timestamp('created_at')->useCurrent();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('feed_apartments_raw');
        Schema::dropIfExists('feed_buildings_raw');
        Schema::dropIfExists('feed_blocks_raw');
    }
};
