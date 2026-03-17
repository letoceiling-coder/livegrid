<?php

namespace App\Models\Catalog;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Builder extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = ['name'];
}