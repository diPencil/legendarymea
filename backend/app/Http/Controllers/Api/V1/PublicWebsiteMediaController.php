<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\WebsiteMediaSlot;

class PublicWebsiteMediaController extends Controller
{
    public function index()
    {
        $slots = WebsiteMediaSlot::query()
            ->with('mediaFile')
            ->orderBy('key')
            ->get()
            ->mapWithKeys(fn (WebsiteMediaSlot $slot) => [
                $slot->key => [
                    'label' => $slot->label,
                    'fallback_path' => $slot->fallback_path,
                    'media_file_id' => $slot->media_file_id,
                    'url' => $slot->mediaFile
                        ? "/api/v1/public/media-files/{$slot->mediaFile->id}/content"
                        : $slot->fallback_path,
                ],
            ]);

        return response()->json(['data' => $slots]);
    }
}
