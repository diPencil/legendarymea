<?php

namespace Tests\Feature\Careers;

use App\Models\Career;
use App\Models\CareerApplication;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class CareerApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    public function test_career_management_supports_create_update_publish_close_and_public_visibility(): void
    {
        $admin = $this->adminUser();

        $response = $this->actingAs($admin)->postJson('/api/v1/careers', [
            'title' => 'Software Engineer',
            'department' => 'Engineering',
            'location' => 'Cairo',
            'type' => 'Full-time',
            'description' => 'Build systems.',
            'requirements' => 'PHP, Laravel',
            'closing_date' => now()->addWeek()->toDateString(),
        ])->assertCreated();

        $careerId = $response->json('data.id');

        $this->assertDatabaseHas('careers', [
            'id' => $careerId,
            'status' => 'draft',
            'created_by' => $admin->id,
        ]);

        $this->getJson('/api/v1/public/careers')->assertOk()->assertJsonCount(0, 'data');

        $this->actingAs($admin)->putJson("/api/v1/careers/{$careerId}", [
            'title' => 'Senior Software Engineer',
            'department' => 'Engineering',
            'location' => 'Dubai',
            'type' => 'Full-time',
            'description' => 'Build larger systems.',
            'requirements' => 'Laravel, Leadership',
            'closing_date' => now()->addDays(10)->toDateString(),
        ])->assertOk();

        $this->actingAs($admin)->postJson("/api/v1/careers/{$careerId}/publish")->assertOk();

        $this->getJson('/api/v1/public/careers')->assertOk()->assertJsonFragment([
            'id' => $careerId,
            'title' => 'Senior Software Engineer',
        ]);

        $this->actingAs($admin)
            ->postJson("/api/v1/careers/{$careerId}/publish")
            ->assertStatus(422)
            ->assertJsonPath('message', 'Only draft jobs can be published.');

        $this->actingAs($admin)->postJson("/api/v1/careers/{$careerId}/close")->assertOk();

        $this->getJson('/api/v1/public/careers')->assertOk()->assertJsonMissing(['id' => $careerId]);

        $this->actingAs($admin)
            ->putJson("/api/v1/careers/{$careerId}", [
                'title' => 'Blocked edit',
                'department' => 'Engineering',
                'location' => 'Dubai',
                'type' => 'Full-time',
                'description' => 'Blocked',
                'requirements' => 'Blocked',
            ])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Closed jobs cannot be edited.');
    }

    public function test_public_application_persists_private_resume_and_hides_internal_fields(): void
    {
        Storage::fake('local');

        $career = Career::query()->create([
            'reference' => 'LM-CAR-' . now()->format('Y') . '-000111',
            'title' => 'Support Engineer',
            'department' => 'Support',
            'location' => 'Riyadh',
            'type' => 'Full-time',
            'description' => 'Help customers.',
            'requirements' => 'Communication',
            'is_active' => true,
            'status' => 'published',
            'published_at' => now(),
        ]);

        $file = UploadedFile::fake()->create('resume.pdf', 200, 'application/pdf');

        $this->postJson("/api/v1/public/careers/{$career->id}/apply", [
            'name' => 'Jane Candidate',
            'email' => 'jane@example.com',
            'phone' => '+201234567890',
            'cover_letter' => 'I would love to join.',
            'resume' => $file,
        ])->assertCreated()->assertJsonMissingPath('data');

        $application = CareerApplication::query()->firstOrFail();

        $this->assertDatabaseHas('career_applications', [
            'id' => $application->id,
            'career_id' => $career->id,
            'name' => 'Jane Candidate',
            'status' => 'new',
        ]);

        Storage::disk('local')->assertExists($application->getRawOriginal('resume_path'));

        $this->getJson("/api/v1/public/careers/{$career->id}")
            ->assertOk()
            ->assertJsonMissingPath('data.assigned_to')
            ->assertJsonMissingPath('data.internal_notes')
            ->assertJsonMissingPath('data.resume_path');
    }

    public function test_application_management_supports_assignment_transitions_and_private_resume_download(): void
    {
        Storage::fake('local');

        $admin = $this->adminUser();
        $viewer = User::factory()->create();
        $manager = User::factory()->create();

        $manager->givePermissionTo('manage_job_applications');
        $viewer->givePermissionTo('view_careers');

        $career = Career::query()->create([
            'reference' => 'LM-CAR-' . now()->format('Y') . '-000222',
            'title' => 'Project Coordinator',
            'department' => 'Operations',
            'location' => 'Doha',
            'type' => 'Full-time',
            'description' => 'Coordinate delivery.',
            'requirements' => 'Organization',
            'is_active' => true,
            'status' => 'published',
            'published_at' => now(),
        ]);

        $path = UploadedFile::fake()->create('resume.docx', 100, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
            ->store('resumes', 'local');

        $application = CareerApplication::query()->create([
            'reference' => 'LM-CAP-' . now()->format('Y') . '-000333',
            'career_id' => $career->id,
            'name' => 'Ahmed Applicant',
            'email' => 'ahmed@example.com',
            'phone' => '+97450000000',
            'resume_path' => $path,
            'cover_letter' => 'Ready to contribute.',
            'status' => 'new',
        ]);

        $this->actingAs($viewer)
            ->putJson("/api/v1/career-applications/{$application->id}", ['status' => 'reviewing'])
            ->assertForbidden();

        $this->actingAs($manager)
            ->putJson("/api/v1/career-applications/{$application->id}", [
                'status' => 'reviewing',
                'assigned_to' => $admin->id,
                'internal_notes' => 'Strong communication skills.',
            ])
            ->assertOk()
            ->assertJsonPath('data.assigned_to', $admin->id)
            ->assertJsonPath('data.status', 'reviewing')
            ->assertJsonPath('data.internal_notes', 'Strong communication skills.')
            ->assertJsonMissingPath('data.resume_path');

        $this->actingAs($manager)
            ->putJson("/api/v1/career-applications/{$application->id}", ['status' => 'hired'])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Invalid application status transition.');

        $this->actingAs($manager)
            ->putJson("/api/v1/career-applications/{$application->id}", [
                'status' => 'shortlisted',
                'assigned_to' => null,
            ])
            ->assertOk()
            ->assertJsonPath('data.assigned_to', null)
            ->assertJsonPath('data.status', 'shortlisted');

        $this->actingAs($viewer)
            ->get("/api/v1/career-applications/{$application->id}/download-resume")
            ->assertOk();

        $blockedUser = User::factory()->create();

        $this->actingAs($blockedUser)
            ->get("/api/v1/career-applications/{$application->id}/download-resume")
            ->assertForbidden();
    }

    private function adminUser(): User
    {
        $user = User::factory()->create();
        $user->assignRole('admin');

        return $user;
    }
}
