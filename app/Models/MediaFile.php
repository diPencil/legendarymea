<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class MediaFile extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'reference',
        'type',
        'filename',
        'original_filename',
        'mime_type',
        'size',
        'width',
        'height',
        'path',
        'disk',
        'collection_name',
        'alt_text_en',
        'alt_text_ar',
        'caption_en',
        'caption_ar',
        'uploaded_by',
    ];

    protected $appends = ['url'];

    public function getUrlAttribute()
    {
        $url = Storage::disk($this->disk)->url($this->path);

        if (Str::startsWith($url, ['http://', 'https://'])) {
            return $url;
        }

        return url($url);
    }

    public function uploader()
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public static function generateReference()
    {
        $year = date('Y');
        $latest = static::where('reference', 'like', "LM-MED-{$year}-%")->orderBy('id', 'desc')->first();
        if ($latest && preg_match('/LM-MED-\d{4}-(\d+)/', $latest->reference, $matches)) {
            $next = intval($matches[1]) + 1;
        } else {
            $next = 1;
        }
        return sprintf("LM-MED-%s-%06d", $year, $next);
    }
}
