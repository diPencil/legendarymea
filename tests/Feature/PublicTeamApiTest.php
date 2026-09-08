<?php

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\MediaFile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class PublicTeamApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_team_lists_only_active_employees_with_safe_fields(): void
    {
        $activeUser = User::factory()->create(['username' => 'nehal', 'email' => 'nehal@legendarymea.com']);
        Employee::factory()->create([
            'user_id' => $activeUser->id,
            'name' => 'Nour Hassan',
            'job_title' => 'Operations Lead',
            'department' => 'Operations',
            'status' => 'active',
            'show_on_team' => true,
            'personal_email' => 'private@example.com',
            'phone' => '01000000000',
            'employee_code' => 'LM-EMP-SECRET',
            'bank_account_number' => '123456789',
        ]);
        Employee::factory()->create(['name' => 'Inactive Person', 'status' => 'inactive', 'show_on_team' => true]);
        Employee::factory()->create(['name' => 'Hidden Person', 'status' => 'active', 'show_on_team' => false]);
        Employee::factory()->create(['name' => 'Deleted Person', 'status' => 'active', 'show_on_team' => true])->delete();

        $response = $this->getJson('/api/v1/public/team');

        $response->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.display_name', 'Nour Hassan')
            ->assertJsonPath('data.0.employee_code', 'LM-EMP-SECRET')
            ->assertJsonPath('data.0.email', 'nehal@legendarymea.com')
            ->assertJsonPath('data.0.job_title', 'Operations Lead')
            ->assertJsonPath('data.0.department', 'Operations');

        $payload = $response->json('data.0');
        $this->assertSame(
            ['slug', 'display_name', 'initials', 'employee_code', 'email', 'job_title', 'department', 'photo_url', 'profile_url'],
            array_keys($payload)
        );

        foreach ($this->sensitiveKeys() as $key) {
            $this->assertArrayNotHasKey($key, $payload);
        }

        $this->assertSame('nehal', $payload['slug']);
        $this->assertSame('/team/nehal', $payload['profile_url']);
    }

    public function test_public_team_show_returns_active_profile_by_username(): void
    {
        $user = User::factory()->create(['username' => 'aly']);
        Employee::factory()->create([
            'user_id' => $user->id,
            'name' => 'Aly Samir',
            'status' => 'active',
            'job_title' => 'Travel Consultant',
            'show_on_team' => true,
        ]);

        $slug = $this->getJson('/api/v1/public/team')->json('data.0.slug');

        $this->getJson("/api/v1/public/team/{$slug}")
            ->assertOk()
            ->assertJsonPath('data.slug', $slug)
            ->assertJsonPath('data.display_name', 'Aly Samir')
            ->assertJsonPath('data.email', $user->email)
            ->assertJsonPath('data.employee_code', Employee::query()->whereBelongsTo($user)->value('employee_code'))
            ->assertJsonMissingPath('data.roles')
            ->assertJsonMissingPath('data.permissions');
    }

    public function test_public_team_does_not_show_inactive_or_soft_deleted_profiles(): void
    {
        $inactiveUser = User::factory()->create(['username' => 'hidden-user']);
        $deletedUser = User::factory()->create(['username' => 'removed-user']);
        $unpublishedUser = User::factory()->create(['username' => 'unpublished-user']);
        Employee::factory()->create(['user_id' => $inactiveUser->id, 'name' => 'Hidden User', 'status' => 'inactive', 'show_on_team' => true]);
        $deleted = Employee::factory()->create(['user_id' => $deletedUser->id, 'name' => 'Removed User', 'status' => 'active', 'show_on_team' => true]);
        $deleted->delete();
        Employee::factory()->create(['user_id' => $unpublishedUser->id, 'name' => 'Unpublished User', 'status' => 'active', 'show_on_team' => false]);

        $this->getJson('/api/v1/public/team/hidden-user')
            ->assertNotFound();

        $this->getJson('/api/v1/public/team/removed-user')
            ->assertNotFound();

        $this->getJson('/api/v1/public/team/unpublished-user')
            ->assertNotFound();
    }

    public function test_public_team_uses_public_media_endpoint_for_employee_avatar(): void
    {
        Storage::fake('public');
        Storage::disk('public')->put('media/avatars/nour.png', 'image-bytes');

        $media = MediaFile::query()->create([
            'reference' => 'team-avatar',
            'filename' => 'nour.png',
            'original_filename' => 'nour.png',
            'disk' => 'public',
            'path' => 'media/avatars/nour.png',
            'mime_type' => 'image/png',
            'extension' => 'png',
            'size' => 11,
            'type' => 'image',
        ]);

        $user = User::factory()->create([
            'name' => 'Nour Hassan',
            'username' => 'nour',
            'avatar_media_id' => $media->id,
            'avatar_path' => 'legacy/avatar.png',
        ]);

        Employee::factory()->create([
            'user_id' => $user->id,
            'name' => 'Nour Hassan',
            'status' => 'active',
            'show_on_team' => true,
        ]);

        $this->getJson('/api/v1/public/team')
            ->assertOk()
            ->assertJsonPath('data.0.photo_url', "/dashboard-api/api/v1/public/media-files/{$media->id}/content");
    }

    public function test_public_team_profile_url_tracks_linked_user_username_changes(): void
    {
        $user = User::factory()->create(['username' => 'nehal']);
        Employee::factory()->create(['user_id' => $user->id, 'name' => 'Nehal Ahmed', 'status' => 'active', 'show_on_team' => true]);

        $this->getJson('/api/v1/public/team')
            ->assertOk()
            ->assertJsonPath('data.0.slug', 'nehal')
            ->assertJsonPath('data.0.profile_url', '/team/nehal');

        $this->getJson('/api/v1/public/team/nehal')->assertOk();

        $user->update(['username' => 'nehal-ahmed']);

        $this->getJson('/api/v1/public/team/nehal')->assertNotFound();
        $this->getJson('/api/v1/public/team/nehal-ahmed')
            ->assertOk()
            ->assertJsonPath('data.slug', 'nehal-ahmed')
            ->assertJsonPath('data.profile_url', '/team/nehal-ahmed');
    }

    /**
     * @return list<string>
     */
    private function sensitiveKeys(): array
    {
        return [
            'username',
            'personal_email',
            'phone',
            'bank_account_number',
            'bank_account_number_masked',
            'national_address',
            'identity_document',
            'identity_document_path',
            'identity_document_original_name',
            'identity_document_mime_type',
            'identity_document_size',
            'documents',
            'roles',
            'permissions',
            'account_invite_status',
            'account_invited_at',
            'account_invite_failed_at',
            'must_change_password',
            'manager',
            'manager_id',
            'notes',
            'show_on_team',
            'status',
        ];
    }
}
