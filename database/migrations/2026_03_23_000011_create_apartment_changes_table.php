<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('apartment_changes')) {
            return;
        }

        Schema::create('apartment_changes', function (Blueprint $table) {
            $table->id();
            $table->string('apartment_id');
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('field');
            $table->text('old_value')->nullable();
            $table->text('new_value')->nullable();
            $table->string('source')->default('manual'); // manual | feed | system
            $table->timestamp('created_at')->useCurrent();

            $table->index('apartment_id');
            $table->index('user_id');
            $table->index('created_at');

            $table->foreign('user_id')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('apartment_changes');
    }
};
