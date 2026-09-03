<?php

namespace Tests\Feature\Approvals;

use App\Models\Approval;
use App\Models\Quotation;
use App\Models\User;
use App\Enums\ApprovalStatus;
use App\Enums\QuotationStatus;
use App\Notifications\ApprovalAssignedNotification;
use App\Notifications\ApprovalApprovedNotification;
use App\Notifications\ApprovalRejectedNotification;
use App\Notifications\ApprovalCancelledNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class ApprovalApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\RolesAndPermissionsSeeder::class);
    }

    public function test_auth_required()
    {
        $this->getJson('/api/v1/approvals')->assertUnauthorized();
    }

    public function test_can_list_approvals()
    {
        $admin = User::factory()->create()->assignRole('admin');
        Approval::factory()->count(3)->create();

        $this->actingAs($admin)
            ->getJson('/api/v1/approvals')
            ->assertOk()
            ->assertJsonCount(3, 'data');
    }

    public function test_can_create_approval()
    {
        $admin = User::factory()->create()->assignRole('admin');
        $quotation = Quotation::factory()->create(['status' => QuotationStatus::DRAFT]);

        $response = $this->actingAs($admin)
            ->postJson('/api/v1/approvals', [
                'quotation_id' => $quotation->id,
                'request_note' => 'Please approve',
            ])
            ->assertCreated();

        $this->assertEquals(ApprovalStatus::PENDING->value, $response->json('data.status'));
        $this->assertEquals($quotation->id, $response->json('data.quotation_id'));
    }

    public function test_cannot_create_approval_for_non_draft_quotation()
    {
        $admin = User::factory()->create()->assignRole('admin');
        $quotation = Quotation::factory()->create(['status' => QuotationStatus::SENT]);

        $this->actingAs($admin)
            ->postJson('/api/v1/approvals', [
                'quotation_id' => $quotation->id,
            ])
            ->assertJsonValidationErrors('quotation_id');
    }

    public function test_cannot_create_multiple_pending_approvals()
    {
        $admin = User::factory()->create()->assignRole('admin');
        $quotation = Quotation::factory()->create(['status' => QuotationStatus::DRAFT]);

        Approval::factory()->create([
            'quotation_id' => $quotation->id,
            'status'       => ApprovalStatus::PENDING,
        ]);

        $this->actingAs($admin)
            ->postJson('/api/v1/approvals', [
                'quotation_id' => $quotation->id,
            ])
            ->assertJsonValidationErrors('quotation_id');
    }

    public function test_cannot_assign_self()
    {
        $admin = User::factory()->create()->assignRole('admin');
        $quotation = Quotation::factory()->create(['status' => QuotationStatus::DRAFT]);

        $this->actingAs($admin)
            ->postJson('/api/v1/approvals', [
                'quotation_id' => $quotation->id,
                'assigned_to'  => $admin->id,
            ])
            ->assertJsonValidationErrors('assigned_to');
    }

    public function test_cannot_decide_own_approval()
    {
        $admin = User::factory()->create()->assignRole('admin');
        $approval = Approval::factory()->create(['requested_by' => $admin->id]);

        $this->actingAs($admin)
            ->postJson("/api/v1/approvals/{$approval->id}/approve", [
                'decision_note' => 'OK',
            ])
            ->assertJsonValidationErrors('decided_by');
    }

    public function test_unassigned_decision()
    {
        $requester = User::factory()->create()->assignRole('admin');
        $decider   = User::factory()->create()->assignRole('admin');
        $approval  = Approval::factory()->create(['requested_by' => $requester->id]);

        $this->actingAs($decider)
            ->postJson("/api/v1/approvals/{$approval->id}/approve", [
                'decision_note' => 'Approved',
            ])
            ->assertOk();

        $this->assertEquals(ApprovalStatus::APPROVED, $approval->fresh()->status);
        $this->assertEquals($decider->id, $approval->fresh()->decided_by);
    }

    public function test_assigned_decision_enforcement()
    {
        $requester = User::factory()->create()->assignRole('admin');
        $assignee  = User::factory()->create()->assignRole('admin');
        $other     = User::factory()->create()->assignRole('admin');

        $approval = Approval::factory()->create([
            'requested_by' => $requester->id,
            'assigned_to'  => $assignee->id,
        ]);

        $this->actingAs($other)
            ->postJson("/api/v1/approvals/{$approval->id}/approve", [])
            ->assertJsonValidationErrors('decided_by');

        $this->actingAs($assignee)
            ->postJson("/api/v1/approvals/{$approval->id}/approve", [])
            ->assertOk();
    }

    public function test_quotation_integrity_with_pending_approval()
    {
        $admin     = User::factory()->create()->assignRole('admin');
        $quotation = Quotation::factory()->create(['status' => QuotationStatus::DRAFT]);
        Approval::factory()->create(['quotation_id' => $quotation->id, 'status' => ApprovalStatus::PENDING]);

        $this->actingAs($admin)
            ->putJson("/api/v1/quotations/{$quotation->id}", ['notes' => 'Test'])
            ->assertJsonValidationErrors('status');

        $this->actingAs($admin)
            ->postJson("/api/v1/quotations/{$quotation->id}/send")
            ->assertJsonValidationErrors('status');

        $this->actingAs($admin)
            ->postJson("/api/v1/quotations/{$quotation->id}/cancel")
            ->assertJsonValidationErrors('status');

        $this->actingAs($admin)
            ->deleteJson("/api/v1/quotations/{$quotation->id}")
            ->assertStatus(422);
    }

    public function test_quotation_integrity_released_on_decision()
    {
        $admin     = User::factory()->create()->assignRole('admin');
        $quotation = Quotation::factory()->create(['status' => QuotationStatus::DRAFT]);
        Approval::factory()->create(['quotation_id' => $quotation->id, 'status' => ApprovalStatus::APPROVED]);

        $this->actingAs($admin)
            ->putJson("/api/v1/quotations/{$quotation->id}", ['notes' => 'Test'])
            ->assertOk();
    }

    public function test_can_edit_pending_approval_request_note_without_changing_status()
    {
        $admin = User::factory()->create()->assignRole('admin');
        $approval = Approval::factory()->create([
            'status' => ApprovalStatus::PENDING,
            'request_note' => 'Original note',
        ]);

        $this->actingAs($admin)
            ->patchJson("/api/v1/approvals/{$approval->id}", [
                'request_note' => 'Updated note',
            ])
            ->assertOk()
            ->assertJsonPath('data.request_note', 'Updated note')
            ->assertJsonPath('data.status', ApprovalStatus::PENDING->value);

        $fresh = $approval->fresh();
        $this->assertEquals(ApprovalStatus::PENDING, $fresh->status);
        $this->assertSame('Updated note', $fresh->request_note);
    }

    public function test_can_edit_approved_approval_request_note_without_changing_status()
    {
        $admin = User::factory()->create()->assignRole('admin');
        $approval = Approval::factory()->approved()->create([
            'request_note' => 'Original approved note',
        ]);

        $this->actingAs($admin)
            ->patchJson("/api/v1/approvals/{$approval->id}", [
                'request_note' => 'Updated approved note',
            ])
            ->assertOk()
            ->assertJsonPath('data.request_note', 'Updated approved note')
            ->assertJsonPath('data.status', ApprovalStatus::APPROVED->value);

        $fresh = $approval->fresh();
        $this->assertEquals(ApprovalStatus::APPROVED, $fresh->status);
        $this->assertSame('Updated approved note', $fresh->request_note);
    }

    public function test_can_edit_rejected_approval_request_note_without_changing_status()
    {
        $admin = User::factory()->create()->assignRole('admin');
        $approval = Approval::factory()->rejected()->create([
            'request_note' => 'Original rejected note',
        ]);

        $this->actingAs($admin)
            ->patchJson("/api/v1/approvals/{$approval->id}", [
                'request_note' => 'Updated rejected note',
            ])
            ->assertOk()
            ->assertJsonPath('data.request_note', 'Updated rejected note')
            ->assertJsonPath('data.status', ApprovalStatus::REJECTED->value);

        $fresh = $approval->fresh();
        $this->assertEquals(ApprovalStatus::REJECTED, $fresh->status);
        $this->assertSame('Updated rejected note', $fresh->request_note);
    }

    // =========================================================================
    // DATABASE NOTIFICATION TESTS
    // =========================================================================

    public function test_create_with_assignee_notifies_assignee()
    {
        Notification::fake();

        $requester = User::factory()->create()->assignRole('admin');
        $assignee  = User::factory()->create()->assignRole('admin');
        $quotation = Quotation::factory()->create(['status' => QuotationStatus::DRAFT]);

        $this->actingAs($requester)
            ->postJson('/api/v1/approvals', [
                'quotation_id' => $quotation->id,
                'assigned_to'  => $assignee->id,
            ])
            ->assertCreated();

        Notification::assertSentTo($assignee, ApprovalAssignedNotification::class);
    }

    public function test_create_with_assignee_does_not_notify_requester()
    {
        Notification::fake();

        $requester = User::factory()->create()->assignRole('admin');
        $assignee  = User::factory()->create()->assignRole('admin');
        $quotation = Quotation::factory()->create(['status' => QuotationStatus::DRAFT]);

        $this->actingAs($requester)
            ->postJson('/api/v1/approvals', [
                'quotation_id' => $quotation->id,
                'assigned_to'  => $assignee->id,
            ])
            ->assertCreated();

        Notification::assertNotSentTo($requester, ApprovalAssignedNotification::class);
    }

    public function test_create_without_assignee_sends_no_notification()
    {
        Notification::fake();

        $requester = User::factory()->create()->assignRole('admin');
        $quotation = Quotation::factory()->create(['status' => QuotationStatus::DRAFT]);

        $this->actingAs($requester)
            ->postJson('/api/v1/approvals', [
                'quotation_id' => $quotation->id,
            ])
            ->assertCreated();

        Notification::assertNothingSent();
    }

    public function test_assign_notifies_new_assignee()
    {
        Notification::fake();

        $actor    = User::factory()->create()->assignRole('admin');
        $assignee = User::factory()->create()->assignRole('admin');
        $approval = Approval::factory()->create(['status' => ApprovalStatus::PENDING]);

        $this->actingAs($actor)
            ->postJson("/api/v1/approvals/{$approval->id}/assign", [
                'assigned_to' => $assignee->id,
            ])
            ->assertOk();

        Notification::assertSentTo($assignee, ApprovalAssignedNotification::class);
    }

    public function test_reassign_notifies_new_assignee_not_old()
    {
        Notification::fake();

        $actor       = User::factory()->create()->assignRole('admin');
        $oldAssignee = User::factory()->create()->assignRole('admin');
        $newAssignee = User::factory()->create()->assignRole('admin');
        $approval    = Approval::factory()->create([
            'status'      => ApprovalStatus::PENDING,
            'assigned_to' => $oldAssignee->id,
        ]);

        $this->actingAs($actor)
            ->postJson("/api/v1/approvals/{$approval->id}/assign", [
                'assigned_to' => $newAssignee->id,
            ])
            ->assertOk();

        Notification::assertSentTo($newAssignee, ApprovalAssignedNotification::class);
        Notification::assertNotSentTo($oldAssignee, ApprovalAssignedNotification::class);
    }

    public function test_unchanged_assignee_receives_no_duplicate_notification()
    {
        Notification::fake();

        $actor    = User::factory()->create()->assignRole('admin');
        $assignee = User::factory()->create()->assignRole('admin');
        $approval = Approval::factory()->create([
            'status'      => ApprovalStatus::PENDING,
            'assigned_to' => $assignee->id,
        ]);

        // Re-assign to the same user
        $this->actingAs($actor)
            ->postJson("/api/v1/approvals/{$approval->id}/assign", [
                'assigned_to' => $assignee->id,
            ])
            ->assertOk();

        Notification::assertNotSentTo($assignee, ApprovalAssignedNotification::class);
    }

    public function test_unassign_sends_no_notification()
    {
        Notification::fake();

        $actor    = User::factory()->create()->assignRole('admin');
        $assignee = User::factory()->create()->assignRole('admin');
        $approval = Approval::factory()->create([
            'status'      => ApprovalStatus::PENDING,
            'assigned_to' => $assignee->id,
        ]);

        $this->actingAs($actor)
            ->postJson("/api/v1/approvals/{$approval->id}/assign", [
                'assigned_to' => null,
            ])
            ->assertOk();

        Notification::assertNothingSent();
    }

    public function test_approve_notifies_requester()
    {
        Notification::fake();

        $requester = User::factory()->create()->assignRole('admin');
        $decider   = User::factory()->create()->assignRole('admin');
        $approval  = Approval::factory()->create([
            'status'       => ApprovalStatus::PENDING,
            'requested_by' => $requester->id,
        ]);

        $this->actingAs($decider)
            ->postJson("/api/v1/approvals/{$approval->id}/approve", [])
            ->assertOk();

        Notification::assertSentTo($requester, ApprovalApprovedNotification::class);
    }

    public function test_approve_does_not_self_notify_decider()
    {
        Notification::fake();

        $requester = User::factory()->create()->assignRole('admin');
        $decider   = User::factory()->create()->assignRole('admin');
        $approval  = Approval::factory()->create([
            'status'       => ApprovalStatus::PENDING,
            'requested_by' => $requester->id,
        ]);

        $this->actingAs($decider)
            ->postJson("/api/v1/approvals/{$approval->id}/approve", [])
            ->assertOk();

        Notification::assertNotSentTo($decider, ApprovalApprovedNotification::class);
    }

    public function test_reject_notifies_requester()
    {
        Notification::fake();

        $requester = User::factory()->create()->assignRole('admin');
        $decider   = User::factory()->create()->assignRole('admin');
        $approval  = Approval::factory()->create([
            'status'       => ApprovalStatus::PENDING,
            'requested_by' => $requester->id,
        ]);

        $this->actingAs($decider)
            ->postJson("/api/v1/approvals/{$approval->id}/reject", [])
            ->assertOk();

        Notification::assertSentTo($requester, ApprovalRejectedNotification::class);
    }

    public function test_reject_does_not_self_notify_decider()
    {
        Notification::fake();

        $requester = User::factory()->create()->assignRole('admin');
        $decider   = User::factory()->create()->assignRole('admin');
        $approval  = Approval::factory()->create([
            'status'       => ApprovalStatus::PENDING,
            'requested_by' => $requester->id,
        ]);

        $this->actingAs($decider)
            ->postJson("/api/v1/approvals/{$approval->id}/reject", [])
            ->assertOk();

        Notification::assertNotSentTo($decider, ApprovalRejectedNotification::class);
    }

    public function test_cancel_notifies_assignee_when_set()
    {
        Notification::fake();

        $actor    = User::factory()->create()->assignRole('admin');
        $assignee = User::factory()->create()->assignRole('admin');
        $approval = Approval::factory()->create([
            'status'      => ApprovalStatus::PENDING,
            'assigned_to' => $assignee->id,
        ]);

        $this->actingAs($actor)
            ->postJson("/api/v1/approvals/{$approval->id}/cancel")
            ->assertOk();

        Notification::assertSentTo($assignee, ApprovalCancelledNotification::class);
    }

    public function test_cancel_without_assignee_sends_no_notification()
    {
        Notification::fake();

        $actor    = User::factory()->create()->assignRole('admin');
        $approval = Approval::factory()->create([
            'status'      => ApprovalStatus::PENDING,
            'assigned_to' => null,
        ]);

        $this->actingAs($actor)
            ->postJson("/api/v1/approvals/{$approval->id}/cancel")
            ->assertOk();

        Notification::assertNothingSent();
    }

    public function test_cancel_does_not_self_notify_actor_who_is_assignee()
    {
        Notification::fake();

        $actor    = User::factory()->create()->assignRole('admin');
        $approval = Approval::factory()->create([
            'status'      => ApprovalStatus::PENDING,
            'assigned_to' => $actor->id,
        ]);

        $this->actingAs($actor)
            ->postJson("/api/v1/approvals/{$approval->id}/cancel")
            ->assertOk();

        Notification::assertNotSentTo($actor, ApprovalCancelledNotification::class);
    }

    public function test_notifications_are_database_channel_only()
    {
        $notification = new ApprovalAssignedNotification(
            Approval::factory()->make()
        );

        $this->assertEquals(['database'], $notification->via(new \stdClass()));
    }

    public function test_no_mail_side_effect_on_approve()
    {
        Notification::fake();

        $requester = User::factory()->create()->assignRole('admin');
        $decider   = User::factory()->create()->assignRole('admin');
        $approval  = Approval::factory()->create([
            'status'       => ApprovalStatus::PENDING,
            'requested_by' => $requester->id,
        ]);

        $this->actingAs($decider)
            ->postJson("/api/v1/approvals/{$approval->id}/approve", [])
            ->assertOk();

        Notification::assertSentTo(
            $requester,
            ApprovalApprovedNotification::class,
            fn ($n) => $n->via(new \stdClass()) === ['database']
        );
    }
}
