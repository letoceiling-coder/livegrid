<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('blocks')) {
            return;
        }

        // Add temporary uuid column
        Schema::table('blocks', function (Blueprint $table) {
            $table->uuid('uuid')->nullable()->after('id');
        });

        // Generate UUIDs for existing records
        $blocks = DB::table('blocks')->get();
        foreach ($blocks as $block) {
            DB::table('blocks')
                ->where('id', $block->id)
                ->update(['uuid' => (string) Str::uuid()]);
        }

        // Drop foreign keys that reference blocks.id
        $foreignKeys = DB::select("
            SELECT CONSTRAINT_NAME, TABLE_NAME
            FROM information_schema.KEY_COLUMN_USAGE 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND REFERENCED_TABLE_NAME = 'blocks' 
            AND REFERENCED_COLUMN_NAME = 'id'
        ");
        
        foreach ($foreignKeys as $fk) {
            DB::statement("ALTER TABLE {$fk->TABLE_NAME} DROP FOREIGN KEY {$fk->CONSTRAINT_NAME}");
        }

        // Change id to UUID
        Schema::table('blocks', function (Blueprint $table) {
            $table->dropPrimary();
        });

        DB::statement("ALTER TABLE blocks MODIFY COLUMN uuid CHAR(36) NOT NULL");
        DB::statement("ALTER TABLE blocks DROP COLUMN id");
        DB::statement("ALTER TABLE blocks CHANGE COLUMN uuid id CHAR(36) NOT NULL");
        DB::statement("ALTER TABLE blocks ADD PRIMARY KEY (id)");

        // Restore foreign keys
        foreach ($foreignKeys as $fk) {
            DB::statement("
                ALTER TABLE {$fk->TABLE_NAME} 
                ADD CONSTRAINT {$fk->CONSTRAINT_NAME} 
                FOREIGN KEY (block_id) REFERENCES blocks(id) ON DELETE CASCADE
            ");
        }
    }

    public function down(): void
    {
        // Revert to string id
        if (Schema::hasTable('blocks')) {
            $foreignKeys = DB::select("
                SELECT CONSTRAINT_NAME, TABLE_NAME
                FROM information_schema.KEY_COLUMN_USAGE 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND REFERENCED_TABLE_NAME = 'blocks' 
                AND REFERENCED_COLUMN_NAME = 'id'
            ");
            
            foreach ($foreignKeys as $fk) {
                DB::statement("ALTER TABLE {$fk->TABLE_NAME} DROP FOREIGN KEY {$fk->CONSTRAINT_NAME}");
            }

            Schema::table('blocks', function (Blueprint $table) {
                $table->dropPrimary();
            });

            DB::statement("ALTER TABLE blocks MODIFY COLUMN id VARCHAR(255) NOT NULL");
            DB::statement("ALTER TABLE blocks ADD PRIMARY KEY (id)");

            foreach ($foreignKeys as $fk) {
                DB::statement("
                    ALTER TABLE {$fk->TABLE_NAME} 
                    ADD CONSTRAINT {$fk->CONSTRAINT_NAME} 
                    FOREIGN KEY (block_id) REFERENCES blocks(id) ON DELETE CASCADE
                ");
            }
        }
    }
};
