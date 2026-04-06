<?php

namespace Tests\Feature\Api\V1;

use Tests\TestCase;

class SearchCountTest extends TestCase
{
    public function test_count_requires_type(): void
    {
        $response = $this->getJson('/api/v1/search/count');

        $response->assertStatus(422);
    }

    public function test_non_apartment_returns_zeros(): void
    {
        $response = $this->getJson('/api/v1/search/count?type=land');

        $response->assertOk()
            ->assertJson([
                'apartments' => 0,
                'complexes'  => 0,
            ]);
    }

}
