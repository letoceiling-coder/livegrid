<?php

namespace App\Models\Catalog;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RoomType extends Model
{
    use HasFactory;

    protected $table = 'rooms';
    public $timestamps = false;
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = ['id', 'name', 'name_one', 'crm_id', 'room_category'];

    protected $casts = [
        'crm_id'        => 'integer',
        'room_category' => 'integer',
    ];
}
