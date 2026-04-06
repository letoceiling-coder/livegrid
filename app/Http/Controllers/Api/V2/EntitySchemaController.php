<?php

namespace App\Http\Controllers\Api\V2;

use App\Http\Controllers\Controller;
use App\Models\Entity\EntityField;
use App\Models\Entity\EntityType;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class EntitySchemaController extends Controller
{
    /** Admin list: all entity types (incl. inactive), with fields. */
    public function index(): JsonResponse
    {
        $types = EntityType::with('fields.options')
            ->orderBy('sort_order')
            ->get()
            ->map(fn (EntityType $t) => $this->serializeType($t));

        return response()->json(['data' => $types]);
    }

    public function storeType(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code'        => ['required', 'string', 'max:100', 'regex:/^[a-z0-9_]+$/', 'unique:entity_types,code'],
            'name'        => ['required', 'string', 'max:255'],
            'icon'        => ['nullable', 'string', 'max:100'],
            'is_active'   => ['boolean'],
            'sort_order'  => ['integer', 'min:0'],
        ]);

        $type = EntityType::create([
            'code'        => $data['code'],
            'name'        => $data['name'],
            'icon'        => $data['icon'] ?? null,
            'is_active'   => $data['is_active'] ?? true,
            'sort_order'  => $data['sort_order'] ?? 0,
        ]);

        return response()->json([
            'data' => $this->serializeType($type->load('fields.options')),
        ], 201);
    }

    public function updateType(Request $request, EntityType $entityType): JsonResponse
    {
        $data = $request->validate([
            'name'       => ['sometimes', 'string', 'max:255'],
            'icon'       => ['sometimes', 'nullable', 'string', 'max:100'],
            'is_active'  => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
        ]);

        $entityType->fill($data);
        $entityType->save();

        return response()->json([
            'data' => $this->serializeType($entityType->fresh('fields.options')),
        ]);
    }

    public function storeField(Request $request, EntityType $entityType): JsonResponse
    {
        $data = $request->validate([
            'code'                 => ['required', 'string', 'max:100', 'regex:/^[a-z0-9_]+$/', Rule::unique('entity_fields', 'code')->where('entity_type_id', $entityType->id)],
            'name'                 => ['required', 'string', 'max:255'],
            'group'                => ['nullable', 'string', 'max:191'],
            'type'                 => ['required', Rule::in(EntityField::TYPES)],
            'is_required'          => ['boolean'],
            'is_filterable'        => ['boolean'],
            'is_searchable'        => ['boolean'],
            'sort_order'           => ['integer', 'min:0'],
            'relation_target_type' => ['nullable', 'string', 'max:100'],
            'relation_label_field' => ['nullable', 'string', 'max:100', 'required_with:relation_target_type'],
            'validation_min'         => ['nullable', 'numeric'],
            'validation_max'         => ['nullable', 'numeric'],
            'validation_pattern'     => self::validationPatternRule(),
            'validation_min_length'  => ['nullable', 'integer', 'min:0', 'max:65535'],
            'validation_max_length'  => ['nullable', 'integer', 'min:0', 'max:65535'],
            'validation_enum'        => ['nullable', 'array', 'max:128'],
            'validation_enum.*'      => ['string', 'max:500'],
        ]);

        if (($data['relation_target_type'] ?? null) !== null && (($data['relation_label_field'] ?? null) === null || trim((string) $data['relation_label_field']) === '')) {
            throw ValidationException::withMessages([
                'relation_label_field' => ['Для relation-поля обязательно укажите relation_label_field.'],
            ]);
        }

        $field = $entityType->fields()->create([
            'code'                   => $data['code'],
            'name'                   => $data['name'],
            'group'                  => $data['group'] ?? null,
            'type'                   => $data['type'],
            'is_required'            => $data['is_required'] ?? false,
            'is_filterable'          => $data['is_filterable'] ?? false,
            'is_searchable'          => $data['is_searchable'] ?? false,
            'sort_order'             => $data['sort_order'] ?? 0,
            'relation_target_type'   => $data['relation_target_type'] ?? null,
            'relation_label_field'   => $data['relation_label_field'] ?? null,
            'validation_min'         => $data['validation_min'] ?? null,
            'validation_max'         => $data['validation_max'] ?? null,
            'validation_pattern'     => $data['validation_pattern'] ?? null,
            'validation_min_length'  => $data['validation_min_length'] ?? null,
            'validation_max_length'  => $data['validation_max_length'] ?? null,
            'validation_enum'        => $data['validation_enum'] ?? null,
        ]);

        return response()->json([
            'data' => $this->serializeField($field),
        ], 201);
    }

    public function updateField(Request $request, EntityField $entityField): JsonResponse
    {
        $entityTypeId = $entityField->entity_type_id;

        $data = $request->validate([
            'name'                   => ['sometimes', 'string', 'max:255'],
            'group'                  => ['sometimes', 'nullable', 'string', 'max:191'],
            'type'                   => ['sometimes', Rule::in(EntityField::TYPES)],
            'is_required'            => ['sometimes', 'boolean'],
            'is_filterable'          => ['sometimes', 'boolean'],
            'is_searchable'          => ['sometimes', 'boolean'],
            'sort_order'             => ['sometimes', 'integer', 'min:0'],
            'relation_target_type'   => ['sometimes', 'nullable', 'string', 'max:100'],
            'relation_label_field'   => ['sometimes', 'nullable', 'string', 'max:100'],
            'validation_min'         => ['sometimes', 'nullable', 'numeric'],
            'validation_max'         => ['sometimes', 'nullable', 'numeric'],
            'validation_pattern'     => array_merge(['sometimes'], self::validationPatternRule()),
            'validation_min_length'  => ['sometimes', 'nullable', 'integer', 'min:0', 'max:65535'],
            'validation_max_length'  => ['sometimes', 'nullable', 'integer', 'min:0', 'max:65535'],
            'validation_enum'        => ['sometimes', 'nullable', 'array', 'max:128'],
            'validation_enum.*'      => ['string', 'max:500'],
            'code'                   => ['sometimes', 'string', 'max:100', 'regex:/^[a-z0-9_]+$/', Rule::unique('entity_fields', 'code')->where('entity_type_id', $entityTypeId)->ignore($entityField->id)],
        ]);

        $nextTarget = array_key_exists('relation_target_type', $data) ? $data['relation_target_type'] : $entityField->relation_target_type;
        $nextLabel  = array_key_exists('relation_label_field', $data) ? $data['relation_label_field'] : $entityField->relation_label_field;
        if ($nextTarget !== null && ($nextLabel === null || trim((string) $nextLabel) === '')) {
            throw ValidationException::withMessages([
                'relation_label_field' => ['Для relation-поля обязательно укажите relation_label_field.'],
            ]);
        }

        if (array_key_exists('type', $data) && $data['type'] !== $entityField->getAttribute('type')) {
            if ($entityField->values()->exists()) {
                throw ValidationException::withMessages([
                    'type' => ['Нельзя менять тип поля: есть сохранённые значения.'],
                ]);
            }
        }

        $entityField->fill($data);
        $entityField->save();

        return response()->json([
            'data' => $this->serializeField($entityField->fresh('options')),
        ]);
    }

    public function destroyField(EntityField $entityField): JsonResponse
    {
        if ($entityField->values()->exists()) {
            throw ValidationException::withMessages([
                'field' => ['Нельзя удалить поле: есть сохранённые значения.'],
            ]);
        }

        $entityField->delete();

        return response()->json(['ok' => true]);
    }

    /**
     * @return array<int, string|Closure>
     */
    private static function validationPatternRule(): array
    {
        return [
            'nullable',
            'string',
            'max:500',
            function (string $attribute, mixed $value, Closure $fail): void {
                if (! is_string($value) || $value === '') {
                    return;
                }
                if (@preg_match($value, '') === false) {
                    $fail('Некорректное регулярное выражение (PCRE).');
                }
            },
        ];
    }

    private function serializeType(EntityType $t): array
    {
        return [
            'id'         => $t->id,
            'code'       => $t->code,
            'name'       => $t->name,
            'icon'       => $t->icon,
            'is_active'  => $t->is_active,
            'sort_order' => $t->sort_order,
            'fields'     => $t->fields->sortBy('sort_order')->values()->map(fn (EntityField $f) => $this->serializeField($f))->all(),
        ];
    }

    private function serializeField(EntityField $f): array
    {
        $f->loadMissing('options');

        return [
            'id'                   => $f->id,
            'code'                 => $f->code,
            'name'                 => $f->name,
            'group'                => $f->group,
            'type'                 => $f->type,
            'ui_type'              => EntityController::fieldUiType($f),
            'is_required'          => $f->is_required,
            'is_filterable'        => $f->is_filterable,
            'is_searchable'        => $f->is_searchable,
            'sort_order'           => $f->sort_order,
            'relation_target_type' => $f->relation_target_type,
            'relation_label_field' => $f->relation_label_field,
            'validation_min'         => $f->validation_min !== null ? (float) $f->validation_min : null,
            'validation_max'         => $f->validation_max !== null ? (float) $f->validation_max : null,
            'validation_pattern'     => $f->validation_pattern,
            'validation_min_length'  => $f->validation_min_length,
            'validation_max_length'  => $f->validation_max_length,
            'validation_enum'        => $f->validation_enum,
            'options'                => $f->options->map(fn ($o) => [
                'value' => $o->value,
                'label' => $o->label,
            ])->all(),
        ];
    }
}
