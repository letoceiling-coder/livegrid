<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * GEO HIERARCHY PREPARATION
 *
 * Creates a proper 4-level geo structure without touching existing data:
 *
 *   countries (Russia, Belarus, Kazakhstan…)
 *     └─ geo_regions (Moscow, SPb, Kazan, Novosibirsk…)
 *           └─ cities (Moscow city, Zelenograd…)
 *                 └─ geo_districts (Академический, Алексеевский…)
 *
 * Existing tables:
 *   regions    — 181 Moscow neighborhoods used as districts in blocks.district_id
 *                → stays 100% intact; will migrate to geo_districts later
 *   districts  — was empty legacy table; repurposed to be a semantic alias
 *                view / staging area; columns extended here
 *
 * Migration path (FUTURE, not done here):
 *   1. Populate countries + geo_regions + cities
 *   2. INSERT INTO geo_districts SELECT * FROM regions
 *   3. UPDATE blocks SET district_id → geo_districts.id
 *   4. Drop old regions / districts tables
 */
return new class extends Migration
{
    public function up(): void
    {
        // ── countries ────────────────────────────────────────────────────────
        if (!Schema::hasTable('countries')) {
            Schema::create('countries', function (Blueprint $table) {
                $table->string('id', 36)->primary();   // ISO alpha-2: RU, BY, KZ…
                $table->string('name', 100);
                $table->string('name_en', 100)->nullable();
                $table->string('flag', 10)->nullable(); // emoji flag
                $table->boolean('is_active')->default(true);
                $table->timestamps();
            });

            // Seed Russia as the default country
            DB::table('countries')->insert([
                'id'         => 'RU',
                'name'       => 'Россия',
                'name_en'    => 'Russia',
                'flag'       => '🇷🇺',
                'is_active'  => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // ── geo_regions (federal subjects / oblasts / republics) ─────────────
        if (!Schema::hasTable('geo_regions')) {
            Schema::create('geo_regions', function (Blueprint $table) {
                $table->string('id', 36)->primary();
                $table->string('country_id', 36)->default('RU');
                $table->string('name', 150);
                $table->string('name_en', 150)->nullable();
                $table->string('type', 50)->nullable()  // 'oblast', 'republic', 'krai', 'city_federal'
                      ->comment('oblast|republic|krai|city_federal|autonomous_oblast');
                $table->boolean('is_active')->default(true);
                $table->timestamps();

                $table->foreign('country_id')->references('id')->on('countries')->cascadeOnDelete();
                $table->index('country_id');
            });

            // Seed Moscow as primary geo region
            DB::table('geo_regions')->insert([
                'id'         => 'region-moscow',
                'country_id' => 'RU',
                'name'       => 'Москва',
                'name_en'    => 'Moscow',
                'type'       => 'city_federal',
                'is_active'  => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // ── cities ───────────────────────────────────────────────────────────
        if (!Schema::hasTable('cities')) {
            Schema::create('cities', function (Blueprint $table) {
                $table->string('id', 36)->primary();
                $table->string('geo_region_id', 36);
                $table->string('name', 150);
                $table->string('name_en', 150)->nullable();
                $table->decimal('lat', 10, 7)->nullable();
                $table->decimal('lng', 10, 7)->nullable();
                $table->boolean('is_active')->default(true);
                $table->timestamps();

                $table->foreign('geo_region_id')->references('id')->on('geo_regions')->cascadeOnDelete();
                $table->index('geo_region_id');
            });

            // Seed Moscow city
            DB::table('cities')->insert([
                'id'            => 'city-moscow',
                'geo_region_id' => 'region-moscow',
                'name'          => 'Москва',
                'name_en'       => 'Moscow',
                'lat'           => 55.7558,
                'lng'           => 37.6173,
                'is_active'     => true,
                'created_at'    => now(),
                'updated_at'    => now(),
            ]);
        }

        // ── geo_districts ────────────────────────────────────────────────────
        // Future target for the 181 records currently in `regions`
        if (!Schema::hasTable('geo_districts')) {
            Schema::create('geo_districts', function (Blueprint $table) {
                $table->string('id', 36)->primary();   // will reuse existing region IDs
                $table->string('city_id', 36)->default('city-moscow');
                $table->string('name', 150);
                $table->string('name_en', 150)->nullable();
                $table->boolean('is_active')->default(true);
                $table->timestamps();

                $table->foreign('city_id')->references('id')->on('cities')->cascadeOnDelete();
                $table->index('city_id');
            });
        }

        // ── Extend `districts` table with city_id for future use ─────────────
        // (currently empty legacy table — make it geo-ready)
        if (Schema::hasTable('districts') && !Schema::hasColumn('districts', 'city_id')) {
            Schema::table('districts', function (Blueprint $table) {
                $table->string('city_id', 36)->nullable()->after('id');
                $table->boolean('is_active')->default(true)->after('name');
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('geo_districts');
        Schema::dropIfExists('cities');
        Schema::dropIfExists('geo_regions');
        Schema::dropIfExists('countries');

        // Revert districts table extensions
        if (Schema::hasTable('districts')) {
            Schema::table('districts', function (Blueprint $table) {
                $table->dropColumnIfExists('city_id');
                $table->dropColumnIfExists('is_active');
                $table->dropColumnIfExists('created_at');
                $table->dropColumnIfExists('updated_at');
            });
        }
    }
};
