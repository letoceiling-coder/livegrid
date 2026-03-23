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
            'priceMin' => 'nullable|integer|min:0',
            'priceMax' => 'nullable|integer|min:0',
            'areaMin' => 'nullable|numeric|min:0',
            'areaMax' => 'nullable|numeric|min:0',
            'district' => 'nullable|array',
            'district.*' => 'string',
            'subway' => 'nullable|array',
            'subway.*' => 'string',
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
            'sort' => 'nullable|string|in:price,area,name',
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
        // Нормализация данных
        $this->merge([
            'page' => $this->input('page', 1),
            'perPage' => min((int) $this->input('perPage', 20), 100),
            'sort' => $this->input('sort', 'price'),
            'order' => $this->input('order', 'asc'),
        ]);
    }
}
