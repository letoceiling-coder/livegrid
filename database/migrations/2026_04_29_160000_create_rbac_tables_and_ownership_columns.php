<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('teams')) {
            Schema::create('teams', function (Blueprint $table) {
                $table->id();
                $table->string('name')->unique();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('roles')) {
            Schema::create('roles', function (Blueprint $table) {
                $table->id();
                $table->string('name')->unique();
                $table->string('description')->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('permissions')) {
            Schema::create('permissions', function (Blueprint $table) {
                $table->id();
                $table->string('name')->unique();
                $table->string('description')->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('role_permission')) {
            Schema::create('role_permission', function (Blueprint $table) {
                $table->foreignId('role_id')->constrained('roles')->cascadeOnDelete();
                $table->foreignId('permission_id')->constrained('permissions')->cascadeOnDelete();
                $table->primary(['role_id', 'permission_id']);
            });
        }

        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'role_id')) {
                $table->foreignId('role_id')->nullable()->after('is_admin')->constrained('roles')->nullOnDelete();
            }
            if (! Schema::hasColumn('users', 'team_id')) {
                $table->foreignId('team_id')->nullable()->after('role_id')->constrained('teams')->nullOnDelete();
            }
        });

        Schema::table('lead_requests', function (Blueprint $table) {
            if (! Schema::hasColumn('lead_requests', 'owner_id')) {
                $table->foreignId('owner_id')->nullable()->after('status')->constrained('users')->nullOnDelete();
            }
            if (! Schema::hasColumn('lead_requests', 'team_id')) {
                $table->foreignId('team_id')->nullable()->after('owner_id')->constrained('teams')->nullOnDelete();
            }
        });

        foreach (['apartments', 'blocks'] as $tableName) {
            if (Schema::hasTable($tableName)) {
                Schema::table($tableName, function (Blueprint $table) use ($tableName) {
                    if (! Schema::hasColumn($tableName, 'owner_id')) {
                        $table->foreignId('owner_id')->nullable()->constrained('users')->nullOnDelete();
                    }
                    if (! Schema::hasColumn($tableName, 'team_id')) {
                        $table->foreignId('team_id')->nullable()->constrained('teams')->nullOnDelete();
                    }
                });
            }
        }

        Schema::table('entity_records', function (Blueprint $table) {
            if (! Schema::hasColumn('entity_records', 'owner_id')) {
                $table->foreignId('owner_id')->nullable()->after('created_by')->constrained('users')->nullOnDelete();
            }
            if (! Schema::hasColumn('entity_records', 'team_id')) {
                $table->foreignId('team_id')->nullable()->after('owner_id')->constrained('teams')->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::table('entity_records', function (Blueprint $table) {
            if (Schema::hasColumn('entity_records', 'team_id')) {
                $table->dropConstrainedForeignId('team_id');
            }
            if (Schema::hasColumn('entity_records', 'owner_id')) {
                $table->dropConstrainedForeignId('owner_id');
            }
        });

        foreach (['apartments', 'blocks'] as $tableName) {
            if (Schema::hasTable($tableName)) {
                Schema::table($tableName, function (Blueprint $table) use ($tableName) {
                    if (Schema::hasColumn($tableName, 'team_id')) {
                        $table->dropConstrainedForeignId('team_id');
                    }
                    if (Schema::hasColumn($tableName, 'owner_id')) {
                        $table->dropConstrainedForeignId('owner_id');
                    }
                });
            }
        }

        Schema::table('lead_requests', function (Blueprint $table) {
            if (Schema::hasColumn('lead_requests', 'team_id')) {
                $table->dropConstrainedForeignId('team_id');
            }
            if (Schema::hasColumn('lead_requests', 'owner_id')) {
                $table->dropConstrainedForeignId('owner_id');
            }
        });

        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'team_id')) {
                $table->dropConstrainedForeignId('team_id');
            }
            if (Schema::hasColumn('users', 'role_id')) {
                $table->dropConstrainedForeignId('role_id');
            }
        });

        Schema::dropIfExists('role_permission');
        Schema::dropIfExists('permissions');
        Schema::dropIfExists('roles');
        Schema::dropIfExists('teams');
    }
};
