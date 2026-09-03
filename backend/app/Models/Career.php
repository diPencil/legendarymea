<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Career extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'reference',
        'title',
        'department',
        'location',
        'type',
        'description',
        'requirements',
        'is_active',
        'status',
        'published_at',
        'closing_date',
        'created_by',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'published_at' => 'datetime',
        'closing_date' => 'date',
    ];

    public function applications()
    {
        return $this->hasMany(CareerApplication::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
