<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class BuildingResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return array
     */
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'floors' => $this->floors ?? 0,
            'sections' => $this->sections ?? 0,
            'deadline' => $this->deadline ? $this->deadline->format('Y-m-d') : null,
            'apartments' => ApartmentResource::collection($this->whenLoaded('apartments')),
        ];
    }
}
