<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class EmailTemplate extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'key',
        'subject',
        'body',
        'subject_en',
        'subject_ar',
        'body_en',
        'body_ar',
        'image_media_id',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    protected $appends = [
        'image_url',
    ];

    public function imageMedia()
    {
        return $this->belongsTo(MediaFile::class, 'image_media_id');
    }

    public function getImageUrlAttribute(): ?string
    {
        return $this->imageMedia?->url;
    }
}
