<?php

namespace Tests\Feature\Media;

use App\Models\User;
use App\Models\MediaFile;
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
        $this->assertStringStartsWith('http://localhost/storage/media/', $res->json('data.safe_url'));
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

    public function test_can_soft_delete_media()
    {
        $admin = $this->getAdmin();
        $this->actingAs($admin);
        
        $file = UploadedFile::fake()->create('doc.pdf', 10, 'application/pdf');
        $res = $this->postJson('/api/v1/media-files', ['file' => $file])->assertCreated();
        $mediaId = $res->json('data.id');

        $this->deleteJson("/api/v1/media-files/{$mediaId}")->assertNoContent();

        $this->assertSoftDeleted('media_files', [
            'id' => $mediaId,
        ]);
    }
}
