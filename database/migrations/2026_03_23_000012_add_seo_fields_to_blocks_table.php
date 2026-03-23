<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('blocks', function (Blueprint $table) {
            if (!Schema::hasColumn('blocks', 'seo_title')) {
                $table->string('seo_title', 255)->nullable()->after('infrastructure');
            }
            if (!Schema::hasColumn('blocks', 'seo_description')) {
                $table->text('seo_description')->nullable()->after('seo_title');
            }
        });
    }

    public function down(): void
    {
        Schema::table('blocks', function (Blueprint $table) {
            $table->dropColumn(['seo_title', 'seo_description']);
        });
    }
};
