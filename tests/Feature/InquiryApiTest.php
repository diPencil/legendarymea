<?php

namespace Tests\Feature;

use App\Enums\InquiryStatus;
use App\Models\Inquiry;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class InquiryApiTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    protected function setUp(): void
    {
        parent::setUp();
        Permission::firstOrCreate(['name' => 'view_inquiries']);
        Permission::firstOrCreate(['name' => 'manage_inquiries']);
    }

    private function getAuthUser(array $permissions = []): User
    {
        $user = User::factory()->create();
        foreach ($permissions as $permission) {
            $user->givePermissionTo($permission);
        }
        return $user;
    }

    public function test_requires_auth_and_permissions()
    {
        $this->getJson('/api/v1/inquiries')->assertUnauthorized();

        $user = $this->getAuthUser();
        $this->actingAs($user)->getJson('/api/v1/inquiries')->assertForbidden();
    }

    public function test_view_only_cannot_create_or_mutate()
    {
        $user = $this->getAuthUser(['view_inquiries']);
        $inquiry = Inquiry::factory()->create();

        $this->actingAs($user)->getJson('/api/v1/inquiries')->assertOk();
        $this->actingAs($user)->getJson("/api/v1/inquiries/{$inquiry->id}")->assertOk();

        $this->actingAs($user)->postJson('/api/v1/inquiries', [])->assertForbidden();
        $this->actingAs($user)->putJson("/api/v1/inquiries/{$inquiry->id}", [])->assertForbidden();
        $this->actingAs($user)->deleteJson("/api/v1/inquiries/{$inquiry->id}")->assertForbidden();
    }

    public function test_creates_inquiry_and_handles_status()
    {
        $user = $this->getAuthUser(['manage_inquiries']);

        $payload = [
            'name' => 'John Doe',
            'email' => 'john@example.com',
            'phone' => '123456789',
            'subject' => 'Hello',
            'message' => 'This is a test message.',
        ];

        $res = $this->actingAs($user)->postJson('/api/v1/inquiries', $payload)->assertCreated();
        
        $id = $res->json('data.id');
        $this->assertDatabaseHas('inquiries', [
            'id' => $id,
            'name' => 'John Doe',
            'status' => InquiryStatus::NEW->value,
        ]);

        $this->actingAs($user)->postJson("/api/v1/inquiries/{$id}/status", [
            'status' => InquiryStatus::RESOLVED->value,
        ])->assertOk();

        $this->assertDatabaseHas('inquiries', [
            'id' => $id,
            'status' => InquiryStatus::RESOLVED->value,
        ]);
        $this->assertNotNull(Inquiry::find($id)->resolved_at);

        $this->actingAs($user)->postJson("/api/v1/inquiries/{$id}/status", [
            'status' => InquiryStatus::CLOSED->value,
        ])->assertOk();

        $this->assertNull(Inquiry::find($id)->resolved_at);
    }

    public function test_create_and_update_accept_real_status_field()
    {
        $user = $this->getAuthUser(['manage_inquiries']);

        $payload = [
            'name' => 'Status User',
            'email' => 'status@example.com',
            'subject' => 'Status field',
            'message' => 'This inquiry uses the form status field.',
            'status' => InquiryStatus::IN_PROGRESS->value,
        ];

        $response = $this->actingAs($user)->postJson('/api/v1/inquiries', $payload)->assertCreated();
        $id = $response->json('data.id');

        $this->assertDatabaseHas('inquiries', [
            'id' => $id,
            'status' => InquiryStatus::IN_PROGRESS->value,
        ]);

        $this->actingAs($user)->putJson("/api/v1/inquiries/{$id}", [
            ...$payload,
            'status' => InquiryStatus::RESOLVED->value,
        ])->assertOk();

        $this->assertEquals(InquiryStatus::RESOLVED, Inquiry::find($id)->status);
        $this->assertNotNull(Inquiry::find($id)->resolved_at);

        $this->actingAs($user)->putJson("/api/v1/inquiries/{$id}", [
            ...$payload,
            'status' => InquiryStatus::CLOSED->value,
        ])->assertOk();

        $this->assertEquals(InquiryStatus::CLOSED, Inquiry::find($id)->status);
        $this->assertNull(Inquiry::find($id)->resolved_at);
    }

    public function test_assigns_and_unassigns_inquiry()
    {
        $user = $this->getAuthUser(['manage_inquiries']);
        $assignee = User::factory()->create();
        $inquiry = Inquiry::factory()->create();

        $this->actingAs($user)->postJson("/api/v1/inquiries/{$inquiry->id}/assign", [
            'user_id' => $assignee->id,
        ])->assertOk();

        $this->assertEquals($assignee->id, $inquiry->fresh()->assigned_to);

        $this->actingAs($user)->postJson("/api/v1/inquiries/{$inquiry->id}/unassign")->assertOk();

        $this->assertNull($inquiry->fresh()->assigned_to);
    }
}
