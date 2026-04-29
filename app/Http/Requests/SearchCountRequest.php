<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SearchCountRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'type'         => ['required', 'string', 'in:apartment,house,land,commercial'],
            'search'       => ['nullable', 'string', 'max:255'],
            'price_from'   => ['nullable', 'integer', 'min:0'],
            'price_to'     => ['nullable', 'integer', 'min:0'],
            'rooms'        => ['nullable'],
            'wc'           => ['nullable', 'integer', 'min:1', 'max:10'],
            'area_min'     => ['nullable', 'numeric', 'min:0'],
            'area_max'     => ['nullable', 'numeric', 'min:0'],
            'ceiling_height_min' => ['nullable', 'numeric', 'min:1', 'max:10'],
            'ceiling_height_max' => ['nullable', 'numeric', 'min:1', 'max:10'],
            'floor_min'    => ['nullable', 'integer', 'min:1'],
            'floor_max'    => ['nullable', 'integer', 'min:1'],
            'completion'   => ['nullable', 'string', 'max:64'],
            'living_area_min' => ['nullable', 'numeric', 'min:0'],
            'living_area_max' => ['nullable', 'numeric', 'min:0'],
            'subway_time_max' => ['nullable', 'integer', 'in:5,10,15'],
            'subway_distance_type' => ['nullable', 'array'],
            'subway_distance_type.*' => ['integer', 'in:1,2'],
            'building_type' => ['nullable', 'array'],
            'building_type.*' => ['string', 'max:255'],
            'queue' => ['nullable', 'array'],
            'queue.*' => ['string', 'max:255'],
            'not_first_floor' => ['nullable', 'boolean'],
            'not_last_floor' => ['nullable', 'boolean'],
            'high_floor' => ['nullable', 'boolean'],
            'has_plan' => ['nullable', 'boolean'],
            'sort' => ['nullable', 'string', 'in:price_asc,price_desc,price_per_m2_asc,price_per_m2_desc,area_desc,deadline_asc'],
            'subway' => ['nullable', 'array'],
            'subway.*' => ['string', 'max:255'],
            'district' => ['nullable', 'array'],
            'district.*' => ['string', 'max:255'],
            'builder' => ['nullable', 'array'],
            'builder.*' => ['string', 'max:255'],
        ];
    }
}
