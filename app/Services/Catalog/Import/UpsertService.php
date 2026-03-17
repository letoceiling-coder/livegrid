<?php

namespace App\Services\Catalog\Import;

use App\Models\Catalog\Apartment;
use App\Services\Catalog\Import\DTO\ApartmentDTO;
use Illuminate\Support\Carbon;

class UpsertService
{
    /**
     * Upsert apartment record
     *
     * @param ApartmentDTO $dto
     * @param Carbon $importTime
     * @return Apartment
     */
    public function upsert(ApartmentDTO $dto, Carbon $importTime): Apartment
    {
        $apartment = Apartment::where('source', $dto->source)
            ->where('external_id', $dto->externalId)
            ->first();

        $data = $dto->toArray();
        $data['is_active'] = true;
        $data['last_seen_at'] = $importTime;

        if ($apartment) {
            $apartment->update($data);
            return $apartment;
        }

        return Apartment::create($data);
    }
}
