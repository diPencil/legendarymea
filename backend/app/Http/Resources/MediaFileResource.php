<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MediaFileResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'reference' => $this->reference,
            'type' => $this->type,
            'original_name' => $this->original_filename,
            'mime_type' => $this->mime_type,
            'size_bytes' => $this->size,
            'width' => $this->width,
            'height' => $this->height,
            'alt_text_en' => $this->alt_text_en,
            'alt_text_ar' => $this->alt_text_ar,
            'caption_en' => $this->caption_en,
            'caption_ar' => $this->caption_ar,
            'safe_url' => $this->url,
            'uploaded_by' => $this->whenLoaded('uploader', function () {
                return [
                    'id' => $this->uploader->id,
                    'name' => $this->uploader->name,
                ];
            }),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            // 'is_in_use' => ... (To be implemented when Website module is built)
        ];
    }
}
