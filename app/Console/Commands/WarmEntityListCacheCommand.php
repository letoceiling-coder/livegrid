<?php

namespace App\Console\Commands;

use App\Models\Entity\EntityType;
use App\Services\Entity\EntityService;
use Illuminate\Console\Command;

class WarmEntityListCacheCommand extends Command
{
    protected $signature = 'entity:cache-warm {type? : entity type code} {--per_page=20}';

    protected $description = 'Warm entity list cache for popular filter combinations';

    public function handle(EntityService $service): int
    {
        $typeArg = trim((string) $this->argument('type'));
        $perPage = max(1, (int) $this->option('per_page'));

        $types = $typeArg !== ''
            ? EntityType::query()->where('code', $typeArg)->where('is_active', true)->get()
            : EntityType::query()->where('is_active', true)->get();

        if ($types->isEmpty()) {
            $this->error('No active entity types found.');
            return self::FAILURE;
        }

        foreach ($types as $type) {
            $this->info("Warming cache for type={$type->code} (per_page={$perPage})");

            // 1) Base first page.
            $service->listRecordsCursor($type->code, ['cursor' => ''], $perPage, null);

            // 2) Popular rooms.
            foreach ([1, 2, 3, 4] as $rooms) {
                $service->listRecordsCursor($type->code, ['rooms' => [$rooms], 'cursor' => ''], $perPage, null);
            }

            // 3) Price ranges (rubles).
            $ranges = [
                [3_000_000, 6_000_000],
                [6_000_000, 10_000_000],
                [10_000_000, 15_000_000],
            ];
            foreach ($ranges as [$min, $max]) {
                $service->listRecordsCursor($type->code, ['price_min' => $min, 'price_max' => $max, 'cursor' => ''], $perPage, null);
            }

            // 4) Combined (rooms + price range).
            foreach ([1, 2, 3] as $rooms) {
                [$min, $max] = $ranges[0];
                $service->listRecordsCursor($type->code, [
                    'rooms'     => [$rooms],
                    'price_min' => $min,
                    'price_max' => $max,
                    'cursor'    => '',
                ], $perPage, null);
            }
        }

        $this->info('entity:cache-warm finished.');
        return self::SUCCESS;
    }
}

