<?php

namespace App\Models\Catalog;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Subway extends Model
{
    use HasFactory;

    protected $fillable = ['name'];
}