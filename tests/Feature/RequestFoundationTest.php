<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;
use App\Models\Request;
use App\Models\Company;
use App\Models\Contact;
use App\Models\Opportunity;
use App\Models\Employee;
use App\Models\User;
use App\Enums\RequestStatus;
use App\Enums\RequestPriority;
use App\Enums\ServiceInterest;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RequestFoundationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Seed permissions for tests
        Permission::firstOrCreate(['name' => 'view_requests', 'guard_name' => 'web']);
        Permission::firstOrCreate(['name' => 'manage_requests', 'guard_name' => 'web']);
    }

    public function test_request_model_creation_and_reference_generation()
    {
        $company = Company::factory()->create();
        
        $request = Request::create([
            'company_id' => $company->id,
            'title' => 'Test Request',
            'status' => RequestStatus::NEW,
            'priority' => RequestPriority::NORMAL,
        ]);

        $this->assertNotNull($request->id);
        $this->assertNotNull($request->reference);
        $this->assertStringStartsWith('LM-REQ-' . date('Y') . '-', $request->reference);
        
        $this->assertEquals(RequestStatus::NEW, $request->status);
        $this->assertEquals(RequestPriority::NORMAL, $request->priority);
    }

    public function test_request_relationships()
    {
        $company = Company::factory()->create();
        $contact = Contact::factory()->create(['company_id' => $company->id]);
        $opportunity = Opportunity::factory()->create(['company_id' => $company->id]);
        $employee = Employee::factory()->create();
        $user = User::factory()->create();

        $request = Request::create([
            'company_id' => $company->id,
            'contact_id' => $contact->id,
            'opportunity_id' => $opportunity->id,
            'assigned_to' => $employee->id,
            'created_by' => $user->id,
            'title' => 'Relationship Test',
            'status' => RequestStatus::NEW,
            'priority' => RequestPriority::NORMAL,
        ]);

        $this->assertInstanceOf(Company::class, $request->company);
        $this->assertInstanceOf(Contact::class, $request->contact);
        $this->assertInstanceOf(Opportunity::class, $request->opportunity);
        $this->assertInstanceOf(Employee::class, $request->assignedTo);
        $this->assertInstanceOf(User::class, $request->createdBy);
        
        $this->assertEquals($company->id, $request->company->id);
        $this->assertEquals($contact->id, $request->contact->id);
    }

    public function test_request_factory()
    {
        $request = Request::factory()->create();
        
        $this->assertNotNull($request->id);
        $this->assertNotNull($request->reference);
        $this->assertNotNull($request->company_id);
        $this->assertNotNull($request->title);
    }

    public function test_request_policy()
    {
        $user = User::factory()->create();
        $request = Request::factory()->create();
        
        $this->assertFalse($user->can('view', $request));
        $this->assertFalse($user->can('update', $request));

        $user->givePermissionTo('view_requests');
        $this->assertTrue($user->fresh()->can('view', $request));
        $this->assertFalse($user->fresh()->can('update', $request));

        $user->givePermissionTo('manage_requests');
        $this->assertTrue($user->fresh()->can('update', $request));
        $this->assertTrue($user->fresh()->can('delete', $request));
    }
}
