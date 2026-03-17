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
        Schema::table('apartment_attributes', function (Blueprint $table) {
            $table->unique(['apartment_id', 'attribute_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('apartment_attributes', function (Blueprint $table) {
            $table->dropUnique(['apartment_id', 'attribute_id']);
        });
    }
};
