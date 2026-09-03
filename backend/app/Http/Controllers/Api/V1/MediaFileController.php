<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\MediaFileResource;
use App\Models\MediaFile;
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

        $query = MediaFile::with('uploader');

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

        // Security validation
        $request->validate([
            'file' => 'required|file',
            'collection_name' => 'nullable|string|max:255',
        ]);

        $file = $request->file('file');
        $mimeType = $file->getMimeType();
        $size = $file->getSize();
        $extension = strtolower($file->getClientOriginalExtension() ?: $file->extension());
        $imageInfo = @getimagesize($file->getRealPath()) ?: null;
        $detectedImageMime = is_array($imageInfo) ? ($imageInfo['mime'] ?? null) : null;
        $looksLikeSvg = $extension === 'svg' || $mimeType === 'image/svg+xml' || $this->looksLikeSvg($file->getRealPath());
        $effectiveImageMime = $detectedImageMime ?: $mimeType;
        
        $isImage = $looksLikeSvg || $detectedImageMime !== null || str_starts_with($mimeType, 'image/');
        $type = $isImage ? 'image' : 'document';
        $sanitizedSvg = null;
        
        if ($isImage) {
            $request->validate(['file' => 'max:10240']); // 10MB
            if ($looksLikeSvg) {
                $sanitizedSvg = $this->sanitizeSvg($file->getRealPath());
                $effectiveImageMime = 'image/svg+xml';
                $imageInfo = $this->svgDimensions($sanitizedSvg);
            } elseif (!in_array($effectiveImageMime, ['image/jpeg', 'image/png', 'image/webp', 'image/gif'], true)) {
                abort(422, 'Only JPG, PNG, WEBP, GIF, or SVG images are supported.');
            }
        } else {
            $request->validate(['file' => 'max:20480']); // 20MB
            if (in_array($extension, ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'jfif', 'heic', 'heif', 'avif'], true)) {
                abort(422, 'Only JPG, PNG, WEBP, GIF, or SVG images are supported.');
            }
            if ($mimeType !== 'application/pdf') {
                abort(422, 'Unsupported document type.');
            }
        }

        $originalFilename = $file->getClientOriginalName();
        $safeName = Str::random(40) . '.' . ($isImage ? $this->imageExtension($effectiveImageMime) : $file->extension());
        $path = 'media/' . $safeName;

        if ($sanitizedSvg !== null) {
            Storage::disk('public')->put($path, $sanitizedSvg);
        } else {
            $path = $file->storeAs('media', $safeName, 'public');
        }

        $width = null;
        $height = null;

        if ($isImage && is_array($imageInfo)) {
            $width = $imageInfo[0];
            $height = $imageInfo[1];
        }

        $mediaFile = MediaFile::create([
            'reference' => MediaFile::generateReference(),
            'type' => $type,
            'filename' => basename($path),
            'original_filename' => $originalFilename,
            'mime_type' => $isImage ? $effectiveImageMime : $mimeType,
            'size' => $size,
            'width' => $width,
            'height' => $height,
            'path' => $path,
            'disk' => 'public',
            'collection_name' => $request->collection_name,
            'uploaded_by' => $request->user()->id,
        ]);

        // Audit Log
        if (class_exists(\App\Models\AuditLog::class)) {
            \App\Models\AuditLog::create([
                'user_id' => $request->user()->id,
                'action' => 'media.uploaded',
                'description' => "Uploaded media {$mediaFile->reference}",
                'ip_address' => $request->ip(),
            ]);
        }

        return new MediaFileResource($mediaFile->load('uploader'));
    }

    public function show(MediaFile $mediaFile)
    {
        Gate::authorize('view', $mediaFile);
        return new MediaFileResource($mediaFile->load('uploader'));
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

    public function update(Request $request, MediaFile $mediaFile)
    {
        Gate::authorize('update', $mediaFile);

        $validated = $request->validate([
            'alt_text_en' => 'nullable|string|max:255',
            'alt_text_ar' => 'nullable|string|max:255',
            'caption_en'  => 'nullable|string',
            'caption_ar'  => 'nullable|string',
        ]);

        $mediaFile->update($validated);

        if (class_exists(\App\Models\AuditLog::class)) {
            \App\Models\AuditLog::create([
                'user_id' => $request->user()->id,
                'action' => 'media.metadata_updated',
                'description' => "Updated media metadata for {$mediaFile->reference}",
                'ip_address' => $request->ip(),
            ]);
        }

        return new MediaFileResource($mediaFile->load('uploader'));
    }

    public function destroy(Request $request, MediaFile $mediaFile)
    {
        Gate::authorize('delete', $mediaFile);

        // TODO: Enforce WebPage usage block here when Website module is built.

        Storage::disk($mediaFile->disk)->delete($mediaFile->path);
        
        if (class_exists(\App\Models\AuditLog::class)) {
            \App\Models\AuditLog::create([
                'user_id' => $request->user()->id,
                'action' => 'media.deleted',
                'description' => "Deleted media {$mediaFile->reference}",
                'ip_address' => $request->ip(),
            ]);
        }

        $mediaFile->delete();

        return response()->noContent();
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
