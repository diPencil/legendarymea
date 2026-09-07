<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\MediaFile;
use Illuminate\Support\Facades\Storage;

class PublicMediaFileController extends Controller
{
    public function content(MediaFile $mediaFile)
    {
        if ($mediaFile->type !== 'image') {
            abort(404);
        }

        if (!Storage::disk($mediaFile->disk)->exists($mediaFile->path)) {
            $fallbackPath = $mediaFile->websiteMediaSlots()
                ->whereNotNull('fallback_path')
                ->value('fallback_path');

            if (is_string($fallbackPath) && str_starts_with($fallbackPath, '/') && !str_starts_with($fallbackPath, '//')) {
                return redirect($fallbackPath);
            }

            abort(404, 'Media file not found.');
        }

        return Storage::disk($mediaFile->disk)->response($mediaFile->path, $mediaFile->filename, [
            'Content-Type' => $mediaFile->mime_type,
            'Cache-Control' => 'public, max-age=60',
        ]);
    }
}
