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
        // Ensure id column is properly configured for UUID storage
        // The id column should store UUIDs (36 characters)
        // We keep it as string type but ensure it's sized appropriately
        // Note: Changing PK type is risky, so we only adjust if needed
        Schema::table('apartments', function (Blueprint $table) {
            // Change id to char(36) for proper UUID storage
            // This ensures UUID format (36 chars) while maintaining compatibility
            $table->char('id', 36)->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('apartments', function (Blueprint $table) {
            // Revert to string (no length limit)
            $table->string('id')->change();
        });
    }
};
