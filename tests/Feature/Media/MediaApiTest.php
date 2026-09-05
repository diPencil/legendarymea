<?php

namespace Tests\Feature\Media;

use App\Models\EmailTemplate;
use App\Models\User;
use App\Models\MediaFile;
use App\Models\WebsiteMediaSlot;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class MediaApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\RolesAndPermissionsSeeder::class);
        Storage::fake('public');
    }

    private function getAdmin()
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');
        return $admin;
    }

    private function getUserWithoutPermission()
    {
        return User::factory()->create();
    }

    public function test_auth_and_permissions_required()
    {
        $this->getJson('/api/v1/media-files')->assertUnauthorized();
        
        $user = $this->getUserWithoutPermission();
        $this->actingAs($user)->getJson('/api/v1/media-files')->assertForbidden();
    }

    public function test_can_upload_valid_image_and_derives_metadata()
    {
        $admin = $this->getAdmin();
        $this->actingAs($admin);
        
        // Creating a real image file using GD to ensure getimagesize works
        $imagePath = tempnam(sys_get_temp_dir(), 'test') . '.jpg';
        $image = imagecreatetruecolor(100, 50);
        imagejpeg($image, $imagePath);
        imagedestroy($image);
        
        $file = new UploadedFile($imagePath, 'test.jpg', 'image/jpeg', null, true);

        $res = $this->postJson('/api/v1/media-files', [
            'file' => $file,
        ])->assertCreated();

        $this->assertNotNull($res->json('data.reference'));
        $this->assertEquals('image', $res->json('data.type'));
        $this->assertEquals(100, $res->json('data.width'));
        $this->assertEquals(50, $res->json('data.height'));
        $this->assertEquals('image/jpeg', $res->json('data.mime_type'));
        $this->assertNotNull($res->json('data.safe_url'));
        $this->assertSame('/dashboard-api/api/v1/media-files/'.$res->json('data.id').'/content', $res->json('data.safe_url'));
        $this->assertStringNotContainsString(storage_path(), $res->json('data.safe_url'));
        
        unlink($imagePath);
    }

    public function test_can_upload_valid_pdf()
    {
        $admin = $this->getAdmin();
        $this->actingAs($admin);
        
        $file = UploadedFile::fake()->create('document.pdf', 1000, 'application/pdf');

        $res = $this->postJson('/api/v1/media-files', [
            'file' => $file,
        ])->assertCreated();

        $this->assertEquals('document', $res->json('data.type'));
        $this->assertNull($res->json('data.width'));
    }

    public function test_rejects_invalid_mime_types()
    {
        $admin = $this->getAdmin();
        $this->actingAs($admin);
        
        // Try exe
        $exe = UploadedFile::fake()->create('virus.exe', 10, 'application/x-msdownload');
        $this->postJson('/api/v1/media-files', ['file' => $exe])->assertStatus(422);
    }

    public function test_image_upload_supports_png_webp_gif_svg_and_sanitizes_svg()
    {
        $admin = $this->getAdmin();
        $this->actingAs($admin);

        $png = UploadedFile::fake()->image('campaign.png', 120, 80);
        $this->postJson('/api/v1/media-files', ['file' => $png])
            ->assertCreated()
            ->assertJsonPath('data.mime_type', 'image/png');

        $webp = UploadedFile::fake()->image('campaign.webp', 120, 80);
        $this->postJson('/api/v1/media-files', ['file' => $webp])
            ->assertCreated()
            ->assertJsonPath('data.type', 'image');

        $gif = UploadedFile::fake()->image('animated.gif', 120, 80);
        $this->postJson('/api/v1/media-files', ['file' => $gif])
            ->assertCreated()
            ->assertJsonPath('data.type', 'image');

        $svgPath = tempnam(sys_get_temp_dir(), 'safe-svg') . '.svg';
        file_put_contents($svgPath, '<svg width="600" height="900" xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><script>alert(1)</script><rect width="600" height="900" fill="#081d60"/></svg>');

        $svg = new UploadedFile($svgPath, 'marketing.svg', 'image/svg+xml', null, true);
        $response = $this->postJson('/api/v1/media-files', ['file' => $svg])
            ->assertCreated()
            ->assertJsonPath('data.type', 'image')
            ->assertJsonPath('data.mime_type', 'image/svg+xml')
            ->assertJsonPath('data.width', 600)
            ->assertJsonPath('data.height', 900);

        $media = MediaFile::query()->findOrFail($response->json('data.id'));
        $storedSvg = Storage::disk('public')->get($media->path);
        $this->assertStringNotContainsString('<script', $storedSvg);
        $this->assertStringNotContainsString('onload=', $storedSvg);

        unlink($svgPath);
    }

    public function test_image_upload_rejects_malformed_svg_and_reports_clear_unsupported_image_message()
    {
        $admin = $this->getAdmin();
        $this->actingAs($admin);

        $malformedSvgPath = tempnam(sys_get_temp_dir(), 'bad-svg') . '.svg';
        file_put_contents($malformedSvgPath, '<svg><path>');

        $malformedSvg = new UploadedFile($malformedSvgPath, 'broken.svg', 'image/svg+xml', null, true);
        $this->postJson('/api/v1/media-files', ['file' => $malformedSvg])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Malformed SVG images are not supported.');

        $heic = UploadedFile::fake()->create('photo.heic', 100, 'application/octet-stream');
        $this->postJson('/api/v1/media-files', ['file' => $heic])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Only JPG, PNG, WEBP, GIF, or SVG images are supported.');

        unlink($malformedSvgPath);
    }

    public function test_image_upload_accepts_real_image_even_when_browser_reports_octet_stream()
    {
        $admin = $this->getAdmin();
        $this->actingAs($admin);

        $imagePath = tempnam(sys_get_temp_dir(), 'octet-image') . '.jpg';
        $image = imagecreatetruecolor(80, 40);
        imagejpeg($image, $imagePath);
        imagedestroy($image);

        $file = new UploadedFile($imagePath, 'campaign-image', 'application/octet-stream', null, true);

        $this->postJson('/api/v1/media-files', ['file' => $file])
            ->assertCreated()
            ->assertJsonPath('data.type', 'image')
            ->assertJsonPath('data.mime_type', 'image/jpeg')
            ->assertJsonPath('data.width', 80)
            ->assertJsonPath('data.height', 40);

        unlink($imagePath);
    }

    public function test_rejects_oversized_files()
    {
        $admin = $this->getAdmin();
        $this->actingAs($admin);
        
        // 11MB image (limit 10MB)
        $bigImage = UploadedFile::fake()->create('big.jpg', 11264, 'image/jpeg');
        $this->postJson('/api/v1/media-files', ['file' => $bigImage])->assertStatus(422);

        // 21MB PDF (limit 20MB)
        $bigPdf = UploadedFile::fake()->create('big.pdf', 21504, 'application/pdf');
        $this->postJson('/api/v1/media-files', ['file' => $bigPdf])->assertStatus(422);
    }

    public function test_can_update_metadata_only()
    {
        $admin = $this->getAdmin();
        $this->actingAs($admin);
        
        $file = UploadedFile::fake()->create('doc.pdf', 10, 'application/pdf');
        $res = $this->postJson('/api/v1/media-files', ['file' => $file])->assertCreated();
        $mediaId = $res->json('data.id');

        $this->putJson("/api/v1/media-files/{$mediaId}", [
            'alt_text_en' => 'Alt EN',
            'caption_en' => 'Caption EN',
            'disk' => 'local', // Should be ignored
            'size' => 9999, // Should be ignored
        ])->assertOk();

        $this->assertDatabaseHas('media_files', [
            'id' => $mediaId,
            'alt_text_en' => 'Alt EN',
            'caption_en' => 'Caption EN',
            'disk' => 'public',
        ]);
    }

    public function test_can_search_and_filter()
    {
        $admin = $this->getAdmin();
        $this->actingAs($admin);
        
        MediaFile::create([
            'reference' => 'LM-MED-2026-000001',
            'type' => 'image',
            'filename' => 'abc.jpg',
            'original_filename' => 'My Photo.jpg',
            'mime_type' => 'image/jpeg',
            'size' => 100,
            'disk' => 'public',
            'path' => 'abc.jpg',
            'uploaded_by' => $admin->id,
        ]);
        
        MediaFile::create([
            'reference' => 'LM-MED-2026-000002',
            'type' => 'document',
            'filename' => 'def.pdf',
            'original_filename' => 'Invoice.pdf',
            'mime_type' => 'application/pdf',
            'size' => 200,
            'disk' => 'public',
            'path' => 'def.pdf',
            'uploaded_by' => $admin->id,
        ]);

        $res = $this->getJson('/api/v1/media-files?search=Photo')->assertOk();
        $this->assertCount(1, $res->json('data'));
        $this->assertEquals('image', $res->json('data.0.type'));

        $res = $this->getJson('/api/v1/media-files?type=document')->assertOk();
        $this->assertCount(1, $res->json('data'));
        $this->assertEquals('document', $res->json('data.0.type'));
    }

    public function test_replace_preserves_media_id_and_removes_old_file()
    {
        $admin = $this->getAdmin();
        $this->actingAs($admin);

        $first = UploadedFile::fake()->image('first.jpg', 120, 80);
        $created = $this->postJson('/api/v1/media-files', ['file' => $first])->assertCreated();
        $mediaId = $created->json('data.id');
        $oldPath = MediaFile::query()->findOrFail($mediaId)->path;

        $second = UploadedFile::fake()->image('second.png', 320, 180);
        $this->postJson("/api/v1/media-files/{$mediaId}/replace", ['file' => $second])
            ->assertOk()
            ->assertJsonPath('data.id', $mediaId)
            ->assertJsonPath('data.original_name', 'second.png')
            ->assertJsonPath('data.mime_type', 'image/png')
            ->assertJsonPath('data.width', 320)
            ->assertJsonPath('data.height', 180);

        $media = MediaFile::query()->findOrFail($mediaId);
        Storage::disk('public')->assertMissing($oldPath);
        Storage::disk('public')->assertExists($media->path);
    }

    public function test_used_media_reports_usage_and_cannot_be_deleted()
    {
        $admin = $this->getAdmin();
        $this->actingAs($admin);

        $created = $this->postJson('/api/v1/media-files', [
            'file' => UploadedFile::fake()->image('campaign.jpg', 200, 120),
        ])->assertCreated();
        $mediaId = $created->json('data.id');

        EmailTemplate::query()->create([
            'name' => 'Corporate Travel',
            'key' => 'corporate-travel',
            'subject' => 'Corporate Travel',
            'body' => 'Body',
            'subject_en' => 'Corporate Travel',
            'subject_ar' => 'رحلات الشركات',
            'body_en' => 'Body',
            'body_ar' => 'النص',
            'image_media_id' => $mediaId,
            'is_active' => true,
        ]);

        WebsiteMediaSlot::query()->create([
            'key' => 'home_hero_hotel',
            'label' => 'Home Hero Hotel',
            'fallback_path' => '/hotel.png',
            'media_file_id' => $mediaId,
        ]);

        $this->getJson("/api/v1/media-files/{$mediaId}")
            ->assertOk()
            ->assertJsonPath('data.is_in_use', true)
            ->assertJsonPath('data.usage_count', 2)
            ->assertJsonFragment(['label' => 'Email Template — Corporate Travel'])
            ->assertJsonFragment(['label' => 'Website — Home Hero Hotel']);

        $this->deleteJson("/api/v1/media-files/{$mediaId}")
            ->assertStatus(409)
            ->assertJsonPath('message', 'This media is currently in use.');

        $this->assertDatabaseHas('media_files', ['id' => $mediaId, 'deleted_at' => null]);
    }

    public function test_usage_filter_can_return_used_and_unused_media()
    {
        $admin = $this->getAdmin();
        $this->actingAs($admin);

        $used = MediaFile::query()->create([
            'reference' => 'LM-MED-2026-000010',
            'type' => 'image',
            'filename' => 'used.jpg',
            'original_filename' => 'Used.jpg',
            'mime_type' => 'image/jpeg',
            'size' => 100,
            'disk' => 'public',
            'path' => 'used.jpg',
            'uploaded_by' => $admin->id,
        ]);

        MediaFile::query()->create([
            'reference' => 'LM-MED-2026-000011',
            'type' => 'image',
            'filename' => 'unused.jpg',
            'original_filename' => 'Unused.jpg',
            'mime_type' => 'image/jpeg',
            'size' => 100,
            'disk' => 'public',
            'path' => 'unused.jpg',
            'uploaded_by' => $admin->id,
        ]);

        WebsiteMediaSlot::query()->create([
            'key' => 'about_section',
            'label' => 'About Section',
            'fallback_path' => '/why-legendary.jpg',
            'media_file_id' => $used->id,
        ]);

        $usedResponse = $this->getJson('/api/v1/media-files?usage=used')->assertOk();
        $this->assertSame(['Used.jpg'], array_column($usedResponse->json('data'), 'original_name'));

        $unusedResponse = $this->getJson('/api/v1/media-files?usage=unused')->assertOk();
        $this->assertSame(['Unused.jpg'], array_column($unusedResponse->json('data'), 'original_name'));
    }

    public function test_can_soft_delete_media()
    {
        $admin = $this->getAdmin();
        $this->actingAs($admin);
        
        $file = UploadedFile::fake()->create('doc.pdf', 10, 'application/pdf');
        $res = $this->postJson('/api/v1/media-files', ['file' => $file])->assertCreated();
        $mediaId = $res->json('data.id');
        $path = MediaFile::query()->findOrFail($mediaId)->path;

        $this->deleteJson("/api/v1/media-files/{$mediaId}")->assertNoContent();

        $this->assertSoftDeleted('media_files', [
            'id' => $mediaId,
        ]);
        Storage::disk('public')->assertMissing($path);
    }
}
