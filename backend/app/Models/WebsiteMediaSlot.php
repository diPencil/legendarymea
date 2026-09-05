<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WebsiteMediaSlot extends Model
{
    use HasFactory;

    protected $fillable = [
        'key',
        'label',
        'fallback_path',
        'media_file_id',
    ];

    public function mediaFile()
    {
        return $this->belongsTo(MediaFile::class);
    }
}
