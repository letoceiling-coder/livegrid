<?php

namespace App\Models\Catalog;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Project extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'address',
        'district_id',
        'builder_id',
        'lat',
        'lng',
        'is_city',
    ];

    public function builder()
    {
        return $this->belongsTo(Builder::class);
    }

    public function district()
    {
        return $this->belongsTo(District::class);
    }

    public function buildings()
    {
        return $this->hasMany(Building::class);
    }

    public function subways()
    {
        return $this->belongsToMany(Subway::class, 'project_subway')
            ->withPivot('distance_time', 'distance_type')
            ->withTimestamps();
    }
}