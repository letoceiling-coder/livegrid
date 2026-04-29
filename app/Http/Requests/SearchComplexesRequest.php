<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SearchComplexesRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'search' => 'nullable|string|max:255',
            'rooms' => 'nullable|array',
            'rooms.*' => 'integer|in:0,1,2,3,4',
            'wc' => 'nullable|array',
            'wc.*' => 'integer|min:1|max:10',
            'priceMin' => 'nullable|integer|min:0',
            'priceMax' => 'nullable|integer|min:0',
            'areaMin' => 'nullable|numeric|min:0',
            'areaMax' => 'nullable|numeric|min:0',
            'livingAreaMin' => 'nullable|numeric|min:0',
            'livingAreaMax' => 'nullable|numeric|min:0',
            'ceilingHeightMin' => 'nullable|numeric|min:1|max:10',
            'ceilingHeightMax' => 'nullable|numeric|min:1|max:10',
            'district' => 'nullable|array',
            'district.*' => 'string',
            'subway' => 'nullable|array',
            'subway.*' => 'string',
            'subwayTimeMax' => 'nullable|integer|in:5,10,15',
            'subwayDistanceType' => 'nullable|array',
            'subwayDistanceType.*' => 'integer|in:1,2',
            'buildingType' => 'nullable|array',
            'buildingType.*' => 'string',
            'queue' => 'nullable|array',
            'queue.*' => 'string',
            'builder' => 'nullable|array',
            'builder.*' => 'string',
            'finishing' => 'nullable|array',
            'finishing.*' => 'string',
            'deadline' => 'nullable|array',
            'deadline.*' => 'string',
            'status' => 'nullable|array',
            'status.*' => 'string|in:building,completed,planned,selling',
            'floorMin' => 'nullable|integer|min:1',
            'floorMax' => 'nullable|integer|min:1',
            'notFirstFloor' => 'nullable|boolean',
            'notLastFloor' => 'nullable|boolean',
            'highFloor' => 'nullable|boolean',
            'hasPlan' => 'nullable|boolean',
            'sort' => 'nullable|string|in:price,area,name,price_asc,price_desc,price_per_m2_asc,price_per_m2_desc,area_desc,deadline_asc',
            'order' => 'nullable|string|in:asc,desc',
            'page' => 'nullable|integer|min:1|max:10000',
            'perPage' => 'nullable|integer|min:1|max:100',
            'bounds.north' => 'nullable|numeric',
            'bounds.south' => 'nullable|numeric',
            'bounds.east' => 'nullable|numeric',
            'bounds.west' => 'nullable|numeric',
        ];
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        $normalizeArray = function (string $key): ?array {
            if (!$this->has($key)) {
                return null;
            }

            $value = $this->input($key);
            if (is_array($value)) {
                return array_values(array_filter($value, static fn ($v) => $v !== '' && $v !== null));
            }

            if (is_string($value)) {
                if (trim($value) === '') {
                    return [];
                }

                return array_values(array_filter(
                    array_map('trim', explode(',', $value)),
                    static fn ($v) => $v !== ''
                ));
            }

            return [$value];
        };

        $normalized = [
            'page' => $this->input('page', 1),
            'perPage' => min((int) $this->input('perPage', 20), 100),
            'sort' => $this->input('sort', 'price_asc'),
            'order' => $this->input('order', 'asc'),
        ];

        foreach ([
            'rooms',
            'wc',
            'district',
            'subway',
            'subwayDistanceType',
            'buildingType',
            'queue',
            'builder',
            'finishing',
            'deadline',
            'status',
        ] as $arrayKey) {
            $arr = $normalizeArray($arrayKey);
            if ($arr !== null) {
                $normalized[$arrayKey] = $arr;
            }
        }

        $this->merge($normalized);
    }
}
