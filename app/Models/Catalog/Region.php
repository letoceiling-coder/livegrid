<?php

namespace App\Models\Catalog;

use Illuminate\Database\Eloquent\Model;

class Region extends Model
{
    protected $table = 'regions';

    public $timestamps = false;

    protected $fillable = ['id', 'name'];

    public $incrementing = false;

    protected $keyType = 'string';
}
