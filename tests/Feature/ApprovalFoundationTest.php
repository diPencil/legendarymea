<?php

namespace Tests\Feature;

use App\Models\Approval;
use App\Models\Quotation;
use App\Models\User;
use App\Enums\ApprovalStatus;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class ApprovalFoundationTest extends TestCase
{
    use RefreshDatabase;

    public function test_approval_schema_exists()
    {
        $this->assertTrue(Schema::hasTable('approvals'));
        $this->assertTrue(Schema::hasColumns('approvals', [
            'id',
            'reference',
            'quotation_id',
            'status',
            'requested_by',
            'assigned_to',
            'request_note',
            'decision_note',
            'requested_at',
            'decided_at',
            'decided_by',
            'deleted_at',
            'created_at',
            'updated_at'
        ]));
    }

    public function test_approval_reference_format()
    {
        $approval = Approval::factory()->create();
        $this->assertStringStartsWith('LM-APR-', $approval->reference);
    }

    public function test_approval_relations()
    {
        $approval = Approval::factory()->create();
        
        $this->assertInstanceOf(Quotation::class, $approval->quotation);
        $this->assertInstanceOf(User::class, $approval->requester);
        $this->assertNull($approval->assignee);
        $this->assertNull($approval->decider);
    }

    public function test_approval_status_is_enum()
    {
        $approval = Approval::factory()->create();
        $this->assertInstanceOf(ApprovalStatus::class, $approval->status);
        $this->assertEquals(ApprovalStatus::PENDING, $approval->status);
    }

    public function test_approval_factory_states()
    {
        $approved = Approval::factory()->approved()->create();
        $this->assertEquals(ApprovalStatus::APPROVED, $approved->status);
        $this->assertInstanceOf(User::class, $approved->decider);
        $this->assertNotNull($approved->decided_at);

        $rejected = Approval::factory()->rejected()->create();
        $this->assertEquals(ApprovalStatus::REJECTED, $rejected->status);
        $this->assertInstanceOf(User::class, $rejected->decider);
        $this->assertNotNull($rejected->decided_at);

        $cancelled = Approval::factory()->cancelled()->create();
        $this->assertEquals(ApprovalStatus::CANCELLED, $cancelled->status);
        $this->assertNull($cancelled->decider);
        $this->assertNull($cancelled->decided_at);
    }

    public function test_quotation_approvals_reverse_relation()
    {
        $quotation = Quotation::factory()->create();
        Approval::factory()->count(2)->create(['quotation_id' => $quotation->id]);

        $this->assertCount(2, $quotation->approvals);
        $this->assertInstanceOf(Approval::class, $quotation->approvals->first());
    }

    public function test_quotation_schema_not_polluted()
    {
        $columns = Schema::getColumnListing('quotations');
        $this->assertNotContains('approval_status', $columns);
        $this->assertNotContains('approval_id', $columns);
        $this->assertNotContains('approved_by', $columns);
        $this->assertNotContains('approved_at', $columns);
        $this->assertNotContains('pending_approval', $columns);
    }

    public function test_soft_deletes_work()
    {
        $approval = Approval::factory()->create();
        $approval->delete();

        $this->assertSoftDeleted($approval);
    }

    public function test_permissions_exist()
    {
        $this->seed(\Database\Seeders\RolesAndPermissionsSeeder::class);
        $this->assertDatabaseHas('permissions', ['name' => 'view_approvals']);
        $this->assertDatabaseHas('permissions', ['name' => 'manage_approvals']);
        $this->assertDatabaseHas('permissions', ['name' => 'decide_approvals']);
    }
}
