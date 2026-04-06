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
            'area_min'     => ['nullable', 'numeric', 'min:0'],
            'area_max'     => ['nullable', 'numeric', 'min:0'],
            'floor_min'    => ['nullable', 'integer', 'min:1'],
            'floor_max'    => ['nullable', 'integer', 'min:1'],
            'completion'   => ['nullable', 'string', 'max:64'],
        ];
    }
}
