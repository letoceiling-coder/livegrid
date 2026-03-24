<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('rooms', function (Blueprint $table) {
            if (!Schema::hasColumn('rooms', 'crm_id')) {
                $table->integer('crm_id')->nullable()->after('id');
            }
            if (!Schema::hasColumn('rooms', 'name_one')) {
                $table->string('name_one')->nullable()->after('crm_id');
            }
            // room_category: 0=studio,1=1-room,2=2-room,3=3-room,4=4+
            if (!Schema::hasColumn('rooms', 'room_category')) {
                $table->tinyInteger('room_category')->nullable()->after('name_one');
            }
        });

        // Add index on crm_id for fast lookup during aggregation
        $exists = \DB::select("SHOW INDEX FROM `rooms` WHERE Key_name = 'rooms_crm_id_index'");
        if (empty($exists)) {
            Schema::table('rooms', function (Blueprint $table) {
                $table->index('crm_id', 'rooms_crm_id_index');
            });
        }
    }

    public function down(): void
    {
        Schema::table('rooms', function (Blueprint $table) {
            $table->dropIndex('rooms_crm_id_index');
            $table->dropColumn(['crm_id', 'name_one', 'room_category']);
        });
    }
};
