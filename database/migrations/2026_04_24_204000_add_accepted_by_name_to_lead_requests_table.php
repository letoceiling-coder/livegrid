<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lead_requests', function (Blueprint $table) {
            $table->string('accepted_by_name')->nullable()->after('accepted_by_user_id');
        });
    }

    public function down(): void
    {
        Schema::table('lead_requests', function (Blueprint $table) {
            $table->dropColumn('accepted_by_name');
        });
    }
};
