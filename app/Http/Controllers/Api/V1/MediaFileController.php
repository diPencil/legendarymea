<?php

namespace App\Http\Controllers\Api\V1;

use App\Services\SystemActivityService;

use App\Http\Controllers\Controller;
use App\Http\Resources\MediaFileResource;
use App\Models\MediaFile;
use App\Models\WebsiteMediaSlot;
use DOMDocument;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class MediaFileController extends Controller
{
    public function index(Request $request)
    {
        Gate::authorize('viewAny', MediaFile::class);

        $query = MediaFile::with(['uploader', 'emailTemplates', 'websiteMediaSlots', 'avatarUsers']);

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('filename', 'like', "%{$search}%")
                  ->orWhere('original_filename', 'like', "%{$search}%")
                  ->orWhere('reference', 'like', "%{$search}%");
            });
        }

        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        if ($request->filled('usage')) {
            $usage = $request->input('usage');
            $query->when($usage === 'used', function ($q) {
                $q->where(function ($used) {
                    $used->whereHas('emailTemplates')->orWhereHas('websiteMediaSlots')->orWhereHas('avatarUsers');
                });
            })->when($usage === 'unused', function ($q) {
                $q->whereDoesntHave('emailTemplates')->whereDoesntHave('websiteMediaSlots')->whereDoesntHave('avatarUsers');
            });
        }

        $sort = $request->input('sort', 'created_at');
        $direction = $request->input('direction', 'desc');
        
        $allowedSorts = ['created_at', 'filename', 'size', 'original_filename'];
        if (in_array($sort, $allowedSorts)) {
            $query->orderBy($sort, $direction === 'asc' ? 'asc' : 'desc');
        }

        $perPage = (int) $request->input('per_page', 24);
        if ($perPage < 1 || $perPage > 100) $perPage = 24;

        return MediaFileResource::collection($query->paginate($perPage));
    }

    public function store(Request $request)
    {
        Gate::authorize('create', MediaFile::class);

        $request->validate([
            'file' => 'required|file',
            'collection_name' => 'nullable|string|max:255',
        ]);

        $data = $this->storeUploadedFile($request, 'file');

        $mediaFile = MediaFile::create([
            'reference' => MediaFile::generateReference(),
            'type' => $data['type'],
            'filename' => basename($data['path']),
            'original_filename' => $data['original_filename'],
            'mime_type' => $data['mime_type'],
            'size' => $data['size'],
            'width' => $data['width'],
            'height' => $data['height'],
            'path' => $data['path'],
            'disk' => 'public',
            'collection_name' => $request->collection_name,
            'uploaded_by' => $request->user()->id,
        ]);

        // Audit Log
        if (class_exists(\App\Models\AuditLog::class)) {
            \App\Services\SystemActivityService::record(
            actor: auth()->user(),
            action: 'uploaded',
            module: 'Media',
            entity: $mediaFile,
            oldValues: [],
            newValues: $this->auditValues($mediaFile),
            metadata: [
                            'media_reference' => $mediaFile->reference,
                            'filename' => $mediaFile->filename,
                        ]
        );
        }

        return new MediaFileResource($mediaFile->load(['uploader', 'emailTemplates', 'websiteMediaSlots', 'avatarUsers']));
    }

    public function show(MediaFile $mediaFile)
    {
        Gate::authorize('view', $mediaFile);
        return new MediaFileResource($mediaFile->load(['uploader', 'emailTemplates', 'websiteMediaSlots', 'avatarUsers']));
    }

    public function content(MediaFile $mediaFile)
    {
        Gate::authorize('view', $mediaFile);

        if (!Storage::disk($mediaFile->disk)->exists($mediaFile->path)) {
            abort(404, 'Media file not found.');
        }

        return Storage::disk($mediaFile->disk)->response($mediaFile->path, $mediaFile->filename, [
            'Content-Type' => $mediaFile->mime_type,
        ]);
    }

    public function download(MediaFile $mediaFile)
    {
        Gate::authorize('view', $mediaFile);

        if (!Storage::disk($mediaFile->disk)->exists($mediaFile->path)) {
            abort(404, 'Media file not found.');
        }

        return Storage::disk($mediaFile->disk)->download(
            $mediaFile->path,
            $mediaFile->original_filename ?: $mediaFile->filename,
            ['Content-Type' => $mediaFile->mime_type]
        );
    }

    public function replace(Request $request, MediaFile $mediaFile)
    {
        Gate::authorize('update', $mediaFile);

        $request->validate(['file' => 'required|file']);

        $oldPath = $mediaFile->path;
        $oldDisk = $mediaFile->disk;
        $data = $this->storeUploadedFile($request, 'file');

        if (($mediaFile->emailTemplates()->exists() || $mediaFile->websiteMediaSlots()->exists() || $mediaFile->avatarUsers()->exists()) && $data['type'] !== 'image') {
            Storage::disk('public')->delete($data['path']);
            abort(422, 'Media currently used as an image must be replaced with another image.');
        }

        try {
            $mediaFile->forceFill([
                'type' => $data['type'],
                'filename' => basename($data['path']),
                'original_filename' => $data['original_filename'],
                'mime_type' => $data['mime_type'],
                'size' => $data['size'],
                'width' => $data['width'],
                'height' => $data['height'],
                'path' => $data['path'],
                'disk' => 'public',
            ])->save();
        } catch (\Throwable $exception) {
            Storage::disk('public')->delete($data['path']);
            throw $exception;
        }

        if ($oldPath && Storage::disk($oldDisk)->exists($oldPath)) {
            Storage::disk($oldDisk)->delete($oldPath);
        }

        if (class_exists(\App\Models\AuditLog::class)) {
            \App\Services\SystemActivityService::record(
            actor: auth()->user(),
            action: 'replaced',
            module: 'Media',
            entity: $mediaFile,
            oldValues: [
                            'path' => $oldPath,
                            'disk' => $oldDisk,
                        ],
            newValues: $this->auditValues($mediaFile),
            metadata: [
                            'media_reference' => $mediaFile->reference,
                            'old_path' => $oldPath,
                            'new_path' => $mediaFile->path,
                        ]
        );
        }

        return new MediaFileResource($mediaFile->fresh()->load(['uploader', 'emailTemplates', 'websiteMediaSlots', 'avatarUsers']));
    }

    public function update(Request $request, MediaFile $mediaFile)
    {
        Gate::authorize('update', $mediaFile);

        $validated = $request->validate([
            'alt_text_en' => 'nullable|string|max:255',
            'alt_text_ar' => 'nullable|string|max:255',
            'caption_en'  => 'nullable|string',
            'caption_ar'  => 'nullable|string',
        ]);

        $oldValues = $this->auditValues($mediaFile);
        $mediaFile->update($validated);

        if (class_exists(\App\Models\AuditLog::class)) {
            \App\Services\SystemActivityService::record(
            actor: auth()->user(),
            action: 'metadata_updated',
            module: 'Media',
            entity: $mediaFile,
            oldValues: $oldValues,
            newValues: $this->auditValues($mediaFile),
            metadata: [
                            'media_reference' => $mediaFile->reference,
                        ]
        );
        }

        return new MediaFileResource($mediaFile->load(['uploader', 'emailTemplates', 'websiteMediaSlots', 'avatarUsers']));
    }

    public function destroy(Request $request, MediaFile $mediaFile)
    {
        Gate::authorize('delete', $mediaFile);

        $mediaFile->load(['emailTemplates', 'websiteMediaSlots', 'avatarUsers']);

        if ($mediaFile->emailTemplates->isNotEmpty() || $mediaFile->websiteMediaSlots->isNotEmpty() || $mediaFile->avatarUsers->isNotEmpty()) {
            return response()->json([
                'message' => 'This media is currently in use.',
                'errors' => ['media' => ['This media is currently in use. Replace it instead or remove its references first.']],
                'usage' => $this->usageSummary($mediaFile),
            ], 409);
        }

        Storage::disk($mediaFile->disk)->delete($mediaFile->path);
        
        if (class_exists(\App\Models\AuditLog::class)) {
            \App\Services\SystemActivityService::record(
            actor: auth()->user(),
            action: 'deleted',
            module: 'Media',
            entity: $mediaFile,
            oldValues: $this->auditValues($mediaFile),
            newValues: [],
            metadata: [
                            'media_reference' => $mediaFile->reference,
                        ]
        );
        }

        $mediaFile->delete();

        return response()->noContent();
    }

    private function storeUploadedFile(Request $request, string $field): array
    {
        $file = $request->file($field);
        $mimeType = $file->getMimeType();
        $size = $file->getSize();
        $extension = strtolower($file->getClientOriginalExtension() ?: $file->extension());
        $imageInfo = @getimagesize($file->getRealPath()) ?: null;
        $detectedImageMime = is_array($imageInfo) ? ($imageInfo['mime'] ?? null) : null;
        $looksLikeSvg = $extension === 'svg' || $mimeType === 'image/svg+xml' || $this->looksLikeSvg($file->getRealPath());
        $effectiveImageMime = $detectedImageMime ?: $mimeType;
        $isImage = $looksLikeSvg || $detectedImageMime !== null || str_starts_with($mimeType, 'image/');
        $sanitizedSvg = null;

        if ($isImage) {
            $request->validate([$field => 'max:10240']);
            if ($looksLikeSvg) {
                $sanitizedSvg = $this->sanitizeSvg($file->getRealPath());
                $effectiveImageMime = 'image/svg+xml';
                $imageInfo = $this->svgDimensions($sanitizedSvg);
            } elseif (!in_array($effectiveImageMime, ['image/jpeg', 'image/png', 'image/webp', 'image/gif'], true)) {
                abort(422, 'Only JPG, PNG, WEBP, GIF, or SVG images are supported.');
            }
        } else {
            $request->validate([$field => 'max:20480']);
            if (in_array($extension, ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'jfif', 'heic', 'heif', 'avif'], true)) {
                abort(422, 'Only JPG, PNG, WEBP, GIF, or SVG images are supported.');
            }
            if ($mimeType !== 'application/pdf') {
                abort(422, 'Unsupported document type.');
            }
        }

        $safeName = Str::random(40) . '.' . ($isImage ? $this->imageExtension($effectiveImageMime) : $file->extension());
        $path = 'media/' . $safeName;

        if ($sanitizedSvg !== null) {
            Storage::disk('public')->put($path, $sanitizedSvg);
        } else {
            $path = $file->storeAs('media', $safeName, 'public');
        }

        return [
            'type' => $isImage ? 'image' : 'document',
            'path' => $path,
            'original_filename' => $file->getClientOriginalName(),
            'mime_type' => $isImage ? $effectiveImageMime : $mimeType,
            'size' => $size,
            'width' => $isImage && is_array($imageInfo) ? $imageInfo[0] : null,
            'height' => $isImage && is_array($imageInfo) ? $imageInfo[1] : null,
        ];
    }

    private function auditValues(MediaFile $mediaFile): array
    {
        return $mediaFile->only([
            'id',
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
            'uploaded_by',
        ]);
    }

    private function usageSummary(MediaFile $mediaFile): array
    {
        $mediaFile->loadMissing(['emailTemplates', 'websiteMediaSlots', 'avatarUsers']);

        return [
            ...$mediaFile->emailTemplates->map(fn ($template) => [
                'type' => 'email_template',
                'label' => 'Email Template — ' . $template->name,
                'reference' => $template->key,
            ])->values()->all(),
            ...$mediaFile->websiteMediaSlots->map(fn (WebsiteMediaSlot $slot) => [
                'type' => 'website',
                'label' => 'Website — ' . $slot->label,
                'reference' => $slot->key,
            ])->values()->all(),
            ...$mediaFile->avatarUsers->map(fn ($user) => [
                'type' => 'user_avatar',
                'label' => 'User Avatar — ' . $user->name,
                'reference' => $user->username,
            ])->values()->all(),
        ];
    }

    private function imageExtension(string $mimeType): string
    {
        return match ($mimeType) {
            'image/png' => 'png',
            'image/webp' => 'webp',
            'image/gif' => 'gif',
            'image/svg+xml' => 'svg',
            default => 'jpg',
        };
    }

    private function looksLikeSvg(string $path): bool
    {
        $contents = file_get_contents($path, false, null, 0, 2048);

        if (!is_string($contents)) {
            return false;
        }

        return str_contains(strtolower($contents), '<svg');
    }

    private function sanitizeSvg(string $path): string
    {
        $contents = file_get_contents($path);

        if (!is_string($contents) || trim($contents) === '') {
            abort(422, 'The SVG image is empty or unreadable.');
        }

        $previous = libxml_use_internal_errors(true);
        $dom = new DOMDocument();
        $loaded = $dom->loadXML($contents, LIBXML_NONET | LIBXML_NOERROR | LIBXML_NOWARNING);
        libxml_clear_errors();
        libxml_use_internal_errors($previous);

        if (!$loaded || !$dom->documentElement || strtolower($dom->documentElement->tagName) !== 'svg') {
            abort(422, 'Malformed SVG images are not supported.');
        }

        $blockedTags = ['script', 'foreignobject', 'iframe', 'object', 'embed'];
        foreach ($blockedTags as $tag) {
            while (($nodes = $dom->getElementsByTagName($tag))->length > 0) {
                $node = $nodes->item(0);
                $node?->parentNode?->removeChild($node);
            }
        }

        foreach ($dom->getElementsByTagName('*') as $node) {
            if (!$node->hasAttributes()) {
                continue;
            }

            $remove = [];
            foreach ($node->attributes as $attribute) {
                $name = strtolower($attribute->name);
                $value = trim(strtolower($attribute->value));

                if (str_starts_with($name, 'on')
                    || in_array($name, ['href', 'xlink:href'], true) && (str_starts_with($value, 'javascript:') || str_starts_with($value, 'data:'))
                    || $name === 'style' && str_contains($value, 'javascript:')
                ) {
                    $remove[] = $attribute->name;
                }
            }

            foreach ($remove as $name) {
                $node->removeAttribute($name);
            }
        }

        return $dom->saveXML($dom->documentElement) ?: '';
    }

    /**
     * @return array{0:int|null,1:int|null}
     */
    private function svgDimensions(string $svg): array
    {
        $previous = libxml_use_internal_errors(true);
        $dom = new DOMDocument();
        $loaded = $dom->loadXML($svg, LIBXML_NONET | LIBXML_NOERROR | LIBXML_NOWARNING);
        libxml_clear_errors();
        libxml_use_internal_errors($previous);

        if (!$loaded || !$dom->documentElement) {
            return [null, null];
        }

        $width = $this->svgLengthToInt($dom->documentElement->getAttribute('width'));
        $height = $this->svgLengthToInt($dom->documentElement->getAttribute('height'));

        if ((!$width || !$height) && preg_match('/^\s*[-\d.]+\s+[-\d.]+\s+([-\d.]+)\s+([-\d.]+)\s*$/', $dom->documentElement->getAttribute('viewBox'), $matches)) {
            $width = $width ?: (int) round((float) $matches[1]);
            $height = $height ?: (int) round((float) $matches[2]);
        }

        return [$width, $height];
    }

    private function svgLengthToInt(string $value): ?int
    {
        return preg_match('/^\s*([0-9]+(?:\.[0-9]+)?)/', $value, $matches)
            ? (int) round((float) $matches[1])
            : null;
    }
}
