<?php

namespace Tests\Feature;

use App\Models\LeadRequest;
use App\Models\Permission;
use App\Models\Role;
use App\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RbacAccessTest extends TestCase
{
    use RefreshDatabase;

    public function test_agent_does_not_see_other_agents_leads(): void
    {
        $team = Team::create(['name' => 'Sales']);
        $agent = $this->userWithRole(Role::AGENT, $team);
        $otherAgent = $this->userWithRole(Role::AGENT, $team);

        $ownLead = LeadRequest::create([
            'name' => 'Own Lead',
            'phone' => '+70000000001',
            'kind' => 'lead',
            'status' => 'new',
            'owner_id' => $agent->id,
            'team_id' => $team->id,
        ]);
        LeadRequest::create([
            'name' => 'Other Lead',
            'phone' => '+70000000002',
            'kind' => 'lead',
            'status' => 'new',
            'owner_id' => $otherAgent->id,
            'team_id' => $team->id,
        ]);

        Sanctum::actingAs($agent);

        $response = $this->getJson('/api/v1/crm/requests');

        $response->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.id', $ownLead->id);
    }

    public function test_manager_does_not_see_another_teams_leads(): void
    {
        $ownTeam = Team::create(['name' => 'Own Team']);
        $otherTeam = Team::create(['name' => 'Other Team']);
        $manager = $this->userWithRole(Role::MANAGER, $ownTeam);
        $agent = $this->userWithRole(Role::AGENT, $otherTeam);

        LeadRequest::create([
            'name' => 'Other Team Lead',
            'phone' => '+70000000003',
            'kind' => 'lead',
            'status' => 'new',
            'owner_id' => $agent->id,
            'team_id' => $otherTeam->id,
        ]);

        Sanctum::actingAs($manager);

        $this->getJson('/api/v1/crm/requests')
            ->assertOk()
            ->assertJsonPath('meta.total', 0);
    }

    public function test_user_cannot_access_crm(): void
    {
        $user = $this->userWithRole(Role::USER, Team::create(['name' => 'Clients']));

        Sanctum::actingAs($user);

        $this->getJson('/api/v1/crm/requests')->assertForbidden();
    }

    public function test_admin_sees_all_leads(): void
    {
        $teamA = Team::create(['name' => 'A']);
        $teamB = Team::create(['name' => 'B']);
        $admin = $this->userWithRole(Role::ADMIN, $teamA, isAdmin: true);
        $agent = $this->userWithRole(Role::AGENT, $teamB);

        LeadRequest::create([
            'name' => 'A',
            'phone' => '+70000000004',
            'kind' => 'lead',
            'status' => 'new',
            'owner_id' => $admin->id,
            'team_id' => $teamA->id,
        ]);
        LeadRequest::create([
            'name' => 'B',
            'phone' => '+70000000005',
            'kind' => 'lead',
            'status' => 'new',
            'owner_id' => $agent->id,
            'team_id' => $teamB->id,
        ]);

        Sanctum::actingAs($admin);

        $this->getJson('/api/v1/crm/requests')
            ->assertOk()
            ->assertJsonPath('meta.total', 2);
    }

    private function userWithRole(string $roleName, Team $team, bool $isAdmin = false): User
    {
        $role = Role::firstOrCreate(['name' => $roleName], ['description' => $roleName]);
        foreach (['leads.read', 'leads.update', 'leads.assign', 'leads.export'] as $permissionName) {
            $permission = Permission::firstOrCreate(['name' => $permissionName]);
            if ($roleName !== Role::USER) {
                $role->permissions()->syncWithoutDetaching([$permission->id]);
            }
        }

        return User::factory()->create([
            'role_id' => $role->id,
            'team_id' => $team->id,
            'is_admin' => $isAdmin,
        ]);
    }
}
