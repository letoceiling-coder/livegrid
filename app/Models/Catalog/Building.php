<?php

namespace App\Models\Catalog;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Building extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_id',
        'name',
        'queue',
        'deadline',
        'building_type_id',
    ];

    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    public function apartments()
    {
        return $this->hasMany(Apartment::class);
    }
}