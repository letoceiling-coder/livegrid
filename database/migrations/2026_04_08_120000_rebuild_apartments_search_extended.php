<?php

use App\Services\Catalog\Import\ApartmentsSearchRefresher;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('apartments')) {
            return;
        }

        app(ApartmentsSearchRefresher::class)->refresh();
    }

    public function down(): void
    {
        // Таблица пересобирается следующим refresh(); откат к прежней схеме не восстанавливаем.
    }
};
