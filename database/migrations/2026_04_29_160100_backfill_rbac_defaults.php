<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private array $permissions = [
        'leads.read',
        'leads.create',
        'leads.update',
        'leads.assign',
        'leads.export',
        'deals.read',
        'deals.create',
        'deals.update',
        'properties.read',
        'properties.create',
        'properties.update',
        'properties.delete',
        'properties.publish',
        'clients.read',
        'clients.create',
        'clients.update',
        'chats.read',
        'chats.takeover',
        'messages.send',
        'users.read',
        'users.create',
        'users.update',
        'roles.read',
        'roles.create',
        'roles.update',
        'roles.delete',
        'analytics.read',
        'settings.update',
        'integrations.manage',
        'entity_schema.manage',
        'entities.read',
        'entities.create',
        'entities.update',
        'entities.delete',
    ];

    public function up(): void
    {
        $now = now();

        $teamId = DB::table('teams')->where('name', 'Default')->value('id');
        if (! $teamId) {
            $teamId = DB::table('teams')->insertGetId([
                'name' => 'Default',
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

        $roleIds = [];
        foreach ([
            'ADMIN' => 'Full system access',
            'MANAGER' => 'Team scoped CRM access',
            'AGENT' => 'Own-record CRM access',
            'USER' => 'Public user access',
        ] as $name => $description) {
            $id = DB::table('roles')->where('name', $name)->value('id');
            if (! $id) {
                $id = DB::table('roles')->insertGetId([
                    'name' => $name,
                    'description' => $description,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }
            $roleIds[$name] = $id;
        }

        $permissionIds = [];
        foreach ($this->permissions as $permission) {
            $id = DB::table('permissions')->where('name', $permission)->value('id');
            if (! $id) {
                $id = DB::table('permissions')->insertGetId([
                    'name' => $permission,
                    'description' => null,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }
            $permissionIds[$permission] = $id;
        }

        foreach ($permissionIds as $permissionId) {
            DB::table('role_permission')->updateOrInsert([
                'role_id' => $roleIds['ADMIN'],
                'permission_id' => $permissionId,
            ]);
        }

        foreach ([
            'leads.read',
            'leads.update',
            'leads.assign',
            'leads.export',
            'properties.read',
            'properties.create',
            'properties.update',
            'properties.delete',
            'analytics.read',
            'entities.read',
            'entities.create',
            'entities.update',
            'entities.delete',
        ] as $permission) {
            DB::table('role_permission')->updateOrInsert([
                'role_id' => $roleIds['MANAGER'],
                'permission_id' => $permissionIds[$permission],
            ]);
        }

        foreach ([
            'leads.read',
            'leads.update',
            'properties.read',
            'properties.create',
            'properties.update',
            'entities.read',
            'entities.create',
            'entities.update',
        ] as $permission) {
            DB::table('role_permission')->updateOrInsert([
                'role_id' => $roleIds['AGENT'],
                'permission_id' => $permissionIds[$permission],
            ]);
        }

        DB::table('users')->whereNull('team_id')->update(['team_id' => $teamId]);
        DB::table('users')->where('is_admin', true)->whereNull('role_id')->update(['role_id' => $roleIds['ADMIN']]);
        DB::table('users')->whereNull('role_id')->update(['role_id' => $roleIds['USER']]);

        $systemUserId = DB::table('users')->where('is_admin', true)->orderBy('id')->value('id')
            ?? DB::table('users')->orderBy('id')->value('id');

        if ($systemUserId) {
            if (Schema::hasTable('lead_requests')) {
                DB::table('lead_requests')
                    ->whereNull('owner_id')
                    ->update(['owner_id' => DB::raw('COALESCE(accepted_by_user_id, ' . (int) $systemUserId . ')')]);
                DB::table('lead_requests')->whereNull('team_id')->update(['team_id' => $teamId]);
            }

            foreach (['apartments', 'blocks'] as $tableName) {
                if (Schema::hasTable($tableName)) {
                    DB::table($tableName)->whereNull('owner_id')->update(['owner_id' => $systemUserId]);
                    DB::table($tableName)->whereNull('team_id')->update(['team_id' => $teamId]);
                }
            }

            if (Schema::hasTable('entity_records')) {
                DB::table('entity_records')
                    ->whereNull('owner_id')
                    ->update(['owner_id' => DB::raw('COALESCE(created_by, ' . (int) $systemUserId . ')')]);
                DB::table('entity_records')->whereNull('team_id')->update(['team_id' => $teamId]);
            }
        }
    }

    public function down(): void
    {
        // Data backfill is intentionally not reversed.
    }
};
