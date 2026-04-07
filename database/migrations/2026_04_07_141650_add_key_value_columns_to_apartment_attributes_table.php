<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('apartment_attributes', function (Blueprint $table) {
            if (! Schema::hasColumn('apartment_attributes', 'attr_key')) {
                $table->string('attr_key')->nullable()->after('apartment_id');
            }
            if (! Schema::hasColumn('apartment_attributes', 'attr_value')) {
                $table->text('attr_value')->nullable()->after('attr_key');
            }
        });
    }

    public function down(): void
    {
        Schema::table('apartment_attributes', function (Blueprint $table) {
            if (Schema::hasColumn('apartment_attributes', 'attr_value')) {
                $table->dropColumn('attr_value');
            }
            if (Schema::hasColumn('apartment_attributes', 'attr_key')) {
                $table->dropColumn('attr_key');
            }
        });
    }
};
