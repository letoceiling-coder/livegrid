<?php

namespace Tests\Feature\Api\V1;

use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TelegramAuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_generate_telegram_code(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/v1/auth/telegram/code');

        $response->assertOk()
            ->assertJsonStructure(['code', 'expiresAt']);

        $this->assertDatabaseHas('telegram_auth_codes', [
            'user_id' => $user->id,
            'code' => $response->json('code'),
        ]);
    }

    public function test_valid_code_is_exchanged_for_token_and_telegram_binding(): void
    {
        $user = User::factory()->create();
        DB::table('telegram_auth_codes')->insert([
            'user_id' => $user->id,
            'code' => '123456',
            'expires_at' => CarbonImmutable::now()->addMinutes(5),
            'used_at' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $response = $this->postJson('/api/auth/telegram', [
            'code' => '123456',
            'telegram_id' => 123456789,
        ]);

        $response->assertOk()->assertJsonStructure(['token', 'user' => ['id', 'name', 'email']]);
        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'telegram_id' => 123456789,
        ]);
    }
}
