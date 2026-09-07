<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class MediaFileResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $usage = $this->usage();

        $previewUrl = $this->previewUrl();

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
            'safe_url' => $previewUrl,
            'content_url' => "/dashboard-api/api/v1/media-files/{$this->id}/content",
            'download_url' => "/dashboard-api/api/v1/media-files/{$this->id}/download",
            'usage' => $usage,
            'usage_count' => count($usage),
            'is_in_use' => count($usage) > 0,
            'uploaded_by' => $this->whenLoaded('uploader', function () {
                return [
                    'id' => $this->uploader->id,
                    'name' => $this->uploader->name,
                ];
            }),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }

    private function previewUrl(): string
    {
        if ($this->type !== 'image') {
            return "/dashboard-api/api/v1/media-files/{$this->id}/content";
        }

        if (Storage::disk($this->disk)->exists($this->path)) {
            return "/dashboard-api/api/v1/public/media-files/{$this->id}/content";
        }

        $fallbackPath = $this->websiteMediaSlots->first()?->fallback_path;

        if (is_string($fallbackPath) && str_starts_with($fallbackPath, '/') && !str_starts_with($fallbackPath, '//')) {
            return $fallbackPath;
        }

        return '/placeholder.jpg';
    }

    private function usage(): array
    {
        $this->resource->loadMissing(['emailTemplates', 'websiteMediaSlots', 'avatarUsers']);

        return [
            ...$this->emailTemplates->map(fn ($template) => [
                'type' => 'email_template',
                'label' => 'Email Template — ' . $template->name,
                'reference' => $template->key,
            ])->values()->all(),
            ...$this->websiteMediaSlots->map(fn ($slot) => [
                'type' => 'website',
                'label' => 'Website — ' . $slot->label,
                'reference' => $slot->key,
            ])->values()->all(),
            ...$this->avatarUsers->map(fn ($user) => [
                'type' => 'user_avatar',
                'label' => 'User Avatar — ' . $user->name,
                'reference' => $user->username,
            ])->values()->all(),
        ];
    }
}
