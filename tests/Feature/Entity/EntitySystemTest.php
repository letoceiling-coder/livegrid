<?php

namespace Tests\Feature\Entity;

use App\Models\Entity\EntityField;
use App\Models\Entity\EntityRecord;
use App\Models\Entity\EntityType;
use App\Models\User;
use App\Services\Entity\EntityService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class EntitySystemTest extends TestCase
{
    use RefreshDatabase;

    private EntityService $service;
    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = app(EntityService::class);

        $this->admin = User::create([
            'name'     => 'Admin',
            'email'    => 'admin@test.com',
            'password' => bcrypt('password'),
            'is_admin' => true,
        ]);
    }

    // ─── Schema setup ────────────────────────────────────────────────────────

    /**
     * Create the "apartment" entity type with price + area fields.
     */
    private function createApartmentType(): EntityType
    {
        $type = EntityType::create([
            'code'      => 'apartment',
            'name'      => 'Квартира',
            'icon'      => 'home',
            'is_active' => true,
        ]);

        EntityField::create([
            'entity_type_id' => $type->id,
            'code'           => 'price',
            'name'           => 'Цена',
            'type'           => 'integer',
            'is_required'    => true,
            'is_filterable'  => true,
            'sort_order'     => 1,
        ]);

        EntityField::create([
            'entity_type_id' => $type->id,
            'code'           => 'area',
            'name'           => 'Площадь',
            'type'           => 'float',
            'is_required'    => true,
            'sort_order'     => 2,
        ]);

        EntityField::create([
            'entity_type_id' => $type->id,
            'code'           => 'address',
            'name'           => 'Адрес',
            'type'           => 'string',
            'is_required'    => false,
            'is_searchable'  => true,
            'sort_order'     => 3,
        ]);

        EntityField::create([
            'entity_type_id' => $type->id,
            'code'           => 'name',
            'name'           => 'Название',
            'type'           => 'string',
            'is_required'    => false,
            'is_searchable'  => true,
            'sort_order'     => 4,
        ]);

        return $type->fresh('fields');
    }

    // ─── Step 1: Create entity type ──────────────────────────────────────────

    public function test_can_create_entity_type_with_fields(): void
    {
        $type = $this->createApartmentType();

        $this->assertDatabaseHas('entity_types', [
            'code'      => 'apartment',
            'name'      => 'Квартира',
            'is_active' => 1,
        ]);

        $this->assertDatabaseHas('entity_fields', ['code' => 'price',   'type' => 'integer', 'entity_type_id' => $type->id]);
        $this->assertDatabaseHas('entity_fields', ['code' => 'area',    'type' => 'float',   'entity_type_id' => $type->id]);
        $this->assertDatabaseHas('entity_fields', ['code' => 'address', 'type' => 'string',  'entity_type_id' => $type->id]);
        $this->assertDatabaseHas('entity_fields', ['code' => 'name',    'type' => 'string',  'entity_type_id' => $type->id]);

        $this->assertCount(4, $type->fields);
    }

    // ─── Step 2: Create a record ─────────────────────────────────────────────

    public function test_can_create_record_via_service(): void
    {
        $this->createApartmentType();

        $record = $this->service->createRecord('apartment', [
            'price'   => 8_500_000,
            'area'    => 52.4,
            'address' => 'ул. Тверская, д. 1',
        ]);

        $this->assertInstanceOf(EntityRecord::class, $record);
        $this->assertDatabaseHas('entity_records', ['id' => $record->id]);
        $this->assertDatabaseHas('entity_values',  ['value_integer' => 8_500_000]);
        $this->assertDatabaseHas('entity_values',  ['value_float'   => 52.4]);
        $this->assertDatabaseHas('entity_values',  ['value_string'  => 'ул. Тверская, д. 1']);
    }

    // ─── Step 3: Get a record ────────────────────────────────────────────────

    public function test_can_get_record_with_resolved_values(): void
    {
        $this->createApartmentType();

        $record = $this->service->createRecord('apartment', [
            'price' => 12_000_000,
            'area'  => 78.0,
        ]);

        $data = $this->service->getRecord($record->id);

        $this->assertEquals('apartment',  $data['type']);
        $this->assertEquals(12_000_000,   $data['values']['price']);
        $this->assertEquals(78.0,         $data['values']['area']);
    }

    // ─── Step 4: Update a record ─────────────────────────────────────────────

    public function test_can_update_record_partial(): void
    {
        $this->createApartmentType();

        $record = $this->service->createRecord('apartment', [
            'price' => 5_000_000,
            'area'  => 40.0,
        ]);

        $this->service->updateRecord($record->id, ['price' => 6_000_000]);

        $data = $this->service->getRecord($record->id);

        $this->assertEquals(6_000_000, $data['values']['price']);
        $this->assertEquals(40.0,      $data['values']['area']); // unchanged
    }

    // ─── Step 5: List records with filter ────────────────────────────────────

    public function test_can_list_records_with_filter(): void
    {
        $this->createApartmentType();

        $this->service->createRecord('apartment', ['price' => 5_000_000, 'area' => 35.0]);
        $this->service->createRecord('apartment', ['price' => 10_000_000, 'area' => 65.0]);
        $this->service->createRecord('apartment', ['price' => 5_000_000, 'area' => 42.0]);

        $paginator = $this->service->listRecords('apartment', ['price' => 5_000_000]);

        $this->assertEquals(2, $paginator->total());

        foreach ($paginator->items() as $item) {
            $this->assertEquals(5_000_000, $item['values']['price']);
        }
    }

    public function test_can_list_records_with_fulltext_search(): void
    {
        $this->createApartmentType();

        $this->service->createRecord('apartment', [
            'price'   => 5_000_000,
            'area'    => 40.0,
            'name'    => ' ЖК FulltextTokenXYZ тест ',
            'address' => 'ул. Примерная',
        ]);

        $this->service->createRecord('apartment', [
            'price'   => 6_000_000,
            'area'    => 50.0,
            'name'    => 'Другой объект',
        ]);

        $paginator = $this->service->listRecords('apartment', ['search' => 'FulltextTokenXYZ']);

        $this->assertGreaterThanOrEqual(1, $paginator->total());
        $this->assertStringContainsString('FulltextTokenXYZ', (string) $paginator->items()[0]['values']['name']);
    }

    // ─── Step 6: Validation errors ───────────────────────────────────────────

    public function test_required_field_validation_fails(): void
    {
        $this->createApartmentType();

        $this->expectException(ValidationException::class);

        // Missing required 'price' field
        $this->service->createRecord('apartment', ['area' => 55.0]);
    }

    public function test_type_mismatch_validation_fails(): void
    {
        $this->createApartmentType();

        $this->expectException(ValidationException::class);

        $this->service->createRecord('apartment', [
            'price' => 'not-a-number',
            'area'  => 55.0,
        ]);
    }

    public function test_unknown_field_validation_fails(): void
    {
        $this->createApartmentType();

        $this->expectException(ValidationException::class);

        $this->service->createRecord('apartment', [
            'price'        => 5_000_000,
            'area'         => 40.0,
            'nonexistent'  => 'value',
        ]);
    }

    // ─── Step 7: API endpoints ───────────────────────────────────────────────

    public function test_api_returns_401_without_auth(): void
    {
        $this->createApartmentType();

        $this->getJson('/api/v2/entities/apartment')->assertStatus(401);
        $this->postJson('/api/v2/entities/apartment', [])->assertStatus(401);
    }

    public function test_api_can_create_and_list_records(): void
    {
        $this->createApartmentType();

        $token = $this->admin->createToken('crm')->plainTextToken;
        $auth  = ['Authorization' => "Bearer {$token}"];

        // Create via API
        $response = $this->postJson('/api/v2/entities/apartment', [
            'price' => 7_200_000,
            'area'  => 48.5,
        ], $auth);

        $response->assertStatus(201)
            ->assertJsonPath('data.type', 'apartment')
            ->assertJsonPath('data.values.price', 7_200_000)
            ->assertJsonPath('data.values.area', 48.5);

        $recordId = $response->json('data.id');

        // List via API
        $list = $this->getJson('/api/v2/entities/apartment', $auth);
        $list->assertStatus(200)
            ->assertJsonPath('meta.total', 1);

        // Show single
        $show = $this->getJson("/api/v2/entities/apartment/{$recordId}", $auth);
        $show->assertStatus(200)
            ->assertJsonPath('data.id', $recordId);
    }

    public function test_api_can_update_record(): void
    {
        $this->createApartmentType();

        $record = $this->service->createRecord('apartment', [
            'price' => 5_000_000,
            'area'  => 40.0,
        ]);

        $token = $this->admin->createToken('crm')->plainTextToken;
        $auth  = ['Authorization' => "Bearer {$token}"];

        $response = $this->putJson("/api/v2/entities/{$record->id}", [
            'price' => 6_500_000,
        ], $auth);

        $response->assertStatus(200)
            ->assertJsonPath('data.values.price', 6_500_000)
            ->assertJsonPath('data.values.area', 40.0);
    }

    public function test_api_returns_404_for_unknown_type(): void
    {
        $token = $this->admin->createToken('crm')->plainTextToken;

        $this->getJson('/api/v2/entities/nonexistent', ['Authorization' => "Bearer {$token}"])
            ->assertStatus(404);
    }

    public function test_api_lists_entity_types(): void
    {
        $this->createApartmentType();

        $token = $this->admin->createToken('crm')->plainTextToken;

        $response = $this->getJson('/api/v2/entity-types', ['Authorization' => "Bearer {$token}"]);

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.code', 'apartment')
            ->assertJsonCount(4, 'data.0.fields');
    }
}
