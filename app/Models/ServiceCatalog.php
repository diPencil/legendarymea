<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ServiceCatalog extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'code',
        'name_en',
        'name_ar',
        'category',
        'description_en',
        'description_ar',
        'active',
        'show_in_contact',
        'available_for_invoice',
        'available_for_active_service',
        'sort_order',
    ];

    protected $casts = [
        'active' => 'boolean',
        'show_in_contact' => 'boolean',
        'available_for_invoice' => 'boolean',
        'available_for_active_service' => 'boolean',
    ];
}
