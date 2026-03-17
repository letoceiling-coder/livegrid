<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('apartment_attributes', function (Blueprint $table) {
            $table->id();
            
            // Check apartments table structure to determine apartment_id type
            // On production, apartments.id is bigint unsigned, not string
            if (DB::getSchemaBuilder()->hasTable('apartments')) {
                $apartmentsIdType = DB::select("SHOW COLUMNS FROM apartments WHERE Field = 'id'");
                if (!empty($apartmentsIdType) && str_contains($apartmentsIdType[0]->Type, 'bigint')) {
                    $table->unsignedBigInteger('apartment_id');
                } else {
                    $table->string('apartment_id');
                }
            } else {
                // Default to string if apartments table doesn't exist yet
                $table->string('apartment_id');
            }
            
            $table->foreignId('attribute_id')->constrained()->cascadeOnDelete();
            $table->bigInteger('value_int')->nullable();
            $table->decimal('value_float', 10, 2)->nullable();
            $table->string('value_string')->nullable();
            $table->boolean('value_bool')->nullable();
            $table->json('value_json')->nullable();
            $table->timestamps();
            
            // Only add foreign key if apartments table exists
            if (DB::getSchemaBuilder()->hasTable('apartments')) {
                $table->foreign('apartment_id')->references('id')->on('apartments')->cascadeOnDelete();
            }
            $table->index('attribute_id');
            $table->index('apartment_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('apartment_attributes');
    }
};
