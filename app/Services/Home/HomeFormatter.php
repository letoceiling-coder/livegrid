<?php

namespace App\Services\Home;

use App\Models\Catalog\Apartment;
use App\Models\Catalog\Complex;
use App\Support\FormatsImages;

class HomeFormatter
{
    use FormatsImages;

    /**
     * Unified home BFF card — keys are always present; use null for missing scalar values.
     * image is always a non-empty absolute URL string.
     *
     * @param  string  $type  complex|apartment
     * @param  list<string>|null  $badges
     * @return array{
     *     id: string,
     *     type: string,
     *     title: string|null,
     *     slug: string|null,
     *     image: string,
     *     price: int|null,
     *     priceFrom: int|null,
     *     priceTo: int|null,
     *     address: string|null,
     *     metro: string|null,
     *     badges: list<string>
     * }
     */
    public function formatPopularComplex(Complex $complex, ?object $searchRow = null): array
    {
        $priceFromRaw = $searchRow->price_from ?? null;
        $priceToRaw = $searchRow->price_to ?? null;
        $priceFrom = $this->nullableNumber($priceFromRaw);
        $priceTo = $this->nullableNumber($priceToRaw);
        if ($priceFrom !== null && $priceFrom <= 0) {
            $priceFrom = null;
        }
        if ($priceTo !== null && $priceTo <= 0) {
            $priceTo = null;
        }

        $title = $this->nullableString($complex->name);
        $slug = $this->nullableString($complex->slug);
        $address = $this->nullableString(optional($complex)->address)
            ?? $this->nullableString(optional($complex->district)->name);
        $metro = $this->nullableString(optional($complex->subways->first())->name);

        $image = $this->resolveComplexImageUrl($complex, $searchRow);
        $image = $image ?: url('/placeholder-complex.svg');

        return $this->homeCard(
            id: (string) $complex->id,
            type: 'complex',
            title: $title,
            slug: $slug,
            image: $image,
            price: null,
            priceFrom: $priceFrom,
            priceTo: $priceTo,
            address: $address,
            metro: $metro,
            badges: [],
        );
    }

    public function formatStartComplex(Complex $complex, ?object $searchRow = null): array
    {
        $base = $this->formatPopularComplex($complex, $searchRow);
        $badges = ['Старт продаж'];
        $badges = array_slice($badges, 0, 2);
        $base['badges'] = $badges ?? [];

        return $base;
    }

    public function formatHotApartment(Apartment $apartment): array
    {
        $complex = $apartment->relationLoaded('complex')
            ? $apartment->complex
            : null;

        $title = $this->nullableString(optional($complex)->name);
        $slug = $this->nullableString(optional($complex)->slug);

        $address = $this->nullableString(
            optional($apartment->complex)->address
                ?? $apartment->getAttribute('district_name')
        );

        $plan = $this->formatImage($apartment->plan_image);
        $imageUrl = $this->ensureAbsoluteImageString($plan, $complex);
        $imageUrl = $imageUrl ?: url('/placeholder-complex.svg');

        $price = $this->nullableNumber($apartment->price);
        if ($price !== null && $price <= 0) {
            $price = null;
        }

        $badges = [];
        if ($apartment->price && (int) $apartment->price < 5_000_000) {
            $badges[] = 'Низкая цена';
        }
        if ($apartment->created_at?->gt(now()->subDays(7))) {
            $badges[] = 'Новинка';
        }
        $badges = array_slice($badges, 0, 2);

        return $this->homeCard(
            id: (string) $apartment->id,
            type: 'apartment',
            title: $title,
            slug: $slug,
            image: $imageUrl,
            price: $price,
            priceFrom: null,
            priceTo: null,
            address: $address,
            metro: null,
            badges: $badges,
        );
    }

    /**
     * @param  list<string>|null  $badges
     */
    private function homeCard(
        string $id,
        string $type,
        ?string $title,
        ?string $slug,
        string $image,
        ?int $price,
        ?int $priceFrom,
        ?int $priceTo,
        ?string $address,
        ?string $metro,
        ?array $badges,
    ): array {
        $image = $image ?: url('/placeholder-complex.svg');

        return [
            'id' => $id,
            'type' => $type,
            'title' => $title,
            'slug' => $slug,
            'image' => $image,
            'price' => $price,
            'priceFrom' => $priceFrom,
            'priceTo' => $priceTo,
            'address' => $address,
            'metro' => $metro,
            'badges' => array_values($badges ?? []),
        ];
    }

    private function resolveComplexImageUrl(Complex $complex, ?object $searchRow): string
    {
        if ($searchRow && ! empty($searchRow->images)) {
            $decoded = is_string($searchRow->images)
                ? json_decode($searchRow->images, true)
                : $searchRow->images;
            if (is_array($decoded) && $decoded !== []) {
                $first = $decoded[0] ?? null;
                $url = $this->formatImage(is_string($first) ? $first : ($first['url'] ?? $first['path'] ?? null));
                if ($url !== null && $url !== '') {
                    return $this->ensureAbsoluteImageString($url, $complex);
                }
            }
        }

        return $this->firstComplexImageUrl($complex);
    }

    private function firstComplexImageUrl(?Complex $complex): string
    {
        if (! $complex) {
            return $this->placeholderImageUrl();
        }

        $images = $this->formatImages($complex->images ?? []);
        if ($images !== []) {
            return $this->ensureAbsoluteImageString($images[0], $complex);
        }

        return $this->placeholderImageUrl();
    }

    private function ensureAbsoluteImageString(?string $url, ?Complex $complex): string
    {
        if ($url !== null && $url !== '') {
            return $url;
        }

        return $this->firstComplexImageUrl($complex);
    }

    private function placeholderImageUrl(): string
    {
        return url('/placeholder-complex.svg');
    }

    private function nullableString(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $value = is_string($value) ? trim($value) : $value;

        if ($value === '' || $value === null) {
            return null;
        }

        return is_string($value) ? $value : (string) $value;
    }

    private function nullableNumber(mixed $value): ?int
    {
        if ($value === null || $value === '') {
            return null;
        }

        return is_numeric($value) ? (int) $value : null;
    }
}
