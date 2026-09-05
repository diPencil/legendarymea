<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\MediaFile;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use App\Traits\ApiResponse;

class ProfileController extends Controller
{
    use ApiResponse;

    public function show(Request $request, $username)
    {
        // 1. Genuinely use the URL username as the canonical identifier.
        // 2. unauthorized other-user profile access blocked
        if ($request->user()->username !== $username) {
            return $this->errorResponse('Unauthorized profile access.', [], 403);
        }

        $user = User::where('username', $username)->first();

        if (!$user) {
            return $this->errorResponse('Profile not found.', [], 404);
        }

        return $this->successResponse([
            'profile' => $this->profilePayload($user),
        ], 'Profile retrieved successfully.');
    }

    public function update(Request $request, $username)
    {
        if ($request->user()->username !== $username) {
            return $this->errorResponse('Unauthorized profile access.', [], 403);
        }

        $user = $request->user();

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'username' => [
                'required',
                'string',
                'min:3',
                'max:40',
                'regex:/^[a-z0-9._-]+$/',
                Rule::unique('users', 'username')->ignore($user->id),
            ],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'current_password' => ['nullable', 'string'],
            'password' => ['nullable', 'string', 'min:8', 'confirmed'],
            'avatar' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp,gif', 'max:4096'],
            'remove_avatar' => ['nullable', 'boolean'],
        ]);

        if (!empty($validated['password'])) {
            if (empty($validated['current_password']) || !Hash::check($validated['current_password'], $user->password)) {
                return $this->errorResponse('Current password is incorrect.', [
                    'current_password' => ['Current password is incorrect.'],
                ], 422);
            }

            $user->password = $validated['password'];
        }

        $user->fill([
            'name' => $validated['name'],
            'username' => $validated['username'],
            'email' => $validated['email'],
        ]);

        if ($request->boolean('remove_avatar') && $user->avatar_path) {
            Storage::disk('public')->delete($user->avatar_path);
            $user->avatar_path = null;
        }

        if ($request->boolean('remove_avatar') && $user->avatar_media_id) {
            $this->deleteDetachedAvatarMedia($user->avatarMedia);
            $user->avatar_media_id = null;
        }

        if ($request->hasFile('avatar')) {
            if ($user->avatar_path) {
                Storage::disk('public')->delete($user->avatar_path);
            }
            if ($user->avatar_media_id) {
                $this->deleteDetachedAvatarMedia($user->avatarMedia);
            }

            $media = $this->createAvatarMedia($request);
            $user->avatar_media_id = $media->id;
            $user->avatar_path = null;
        }

        $user->save();

        return $this->successResponse([
            'profile' => $this->profilePayload($user->fresh()),
        ], 'Profile updated successfully.');
    }

    private function profilePayload(User $user): array
    {
        return [
            'name' => $user->name,
            'username' => $user->username,
            'email' => $user->email,
            'status' => $user->status->value,
            'roles' => $user->getRoleNames(),
            'avatar_url' => $user->avatar_media_id
                ? "/dashboard-api/api/v1/media-files/{$user->avatar_media_id}/content"
                : $this->avatarUrl($user->avatar_path),
        ];
    }

    private function avatarUrl(?string $path): ?string
    {
        return $path ? Storage::disk('public')->url($path) : null;
    }

    private function createAvatarMedia(Request $request): MediaFile
    {
        $file = $request->file('avatar');
        $imageInfo = @getimagesize($file->getRealPath()) ?: null;
        $mimeType = is_array($imageInfo) ? ($imageInfo['mime'] ?? $file->getMimeType()) : $file->getMimeType();
        $safeName = Str::random(40) . '.' . strtolower($file->getClientOriginalExtension() ?: $file->extension());
        $path = $file->storeAs('media/avatars', $safeName, 'public');

        return MediaFile::query()->create([
            'reference' => MediaFile::generateReference(),
            'type' => 'image',
            'filename' => basename($path),
            'original_filename' => $file->getClientOriginalName(),
            'mime_type' => $mimeType,
            'size' => $file->getSize(),
            'width' => is_array($imageInfo) ? $imageInfo[0] : null,
            'height' => is_array($imageInfo) ? $imageInfo[1] : null,
            'path' => $path,
            'disk' => 'public',
            'collection_name' => 'avatars',
            'uploaded_by' => $request->user()->id,
        ]);
    }

    private function deleteDetachedAvatarMedia(?MediaFile $media): void
    {
        if (!$media) {
            return;
        }

        Storage::disk($media->disk)->delete($media->path);
        $media->delete();
    }
}
