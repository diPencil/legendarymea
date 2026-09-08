<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class PublicTeamMemberResource extends JsonResource
{
    /**
     * Transform the resource into a public-safe team profile.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $displayName = $this->publicName();

        return [
            'slug' => $this->publicSlug(),
            'display_name' => $displayName,
            'initials' => $this->initials($displayName),
            'employee_code' => $this->employee_code,
            'email' => $this->user?->email,
            'job_title' => $this->job_title,
            'department' => $this->department,
            'photo_url' => $this->photoUrl(),
            'profile_url' => "/team/{$this->publicSlug()}",
        ];
    }

    public function publicSlug(): string
    {
        return (string) $this->user?->username;
    }

    private function publicName(): string
    {
        return trim((string) ($this->name ?: $this->user?->name ?: __('Team member')));
    }

    private function photoUrl(): ?string
    {
        $user = $this->resource->relationLoaded('user') ? $this->user : null;

        if (!$user) {
            return null;
        }

        $media = $user->avatarMedia;

        if ($media && $media->type === 'image' && Storage::disk($media->disk)->exists($media->path)) {
            return "/dashboard-api/api/v1/public/media-files/{$media->id}/content";
        }

        return $user->avatar_path ? Storage::disk('public')->url($user->avatar_path) : null;
    }

    private function initials(string $name): string
    {
        $words = preg_split('/\s+/u', trim($name)) ?: [];
        $letters = array_map(fn (string $word) => mb_substr($word, 0, 1), array_slice(array_filter($words), 0, 2));

        return mb_strtoupper(implode('', $letters)) ?: 'LM';
    }
}
