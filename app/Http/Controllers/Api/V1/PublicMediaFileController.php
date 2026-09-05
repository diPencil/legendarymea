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
            abort(404, 'Media file not found.');
        }

        return Storage::disk($mediaFile->disk)->response($mediaFile->path, $mediaFile->filename, [
            'Content-Type' => $mediaFile->mime_type,
            'Cache-Control' => 'public, max-age=60',
        ]);
    }
}
