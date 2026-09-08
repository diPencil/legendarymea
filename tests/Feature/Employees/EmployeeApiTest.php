<?php

namespace Tests\Feature\Employees;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;
use App\Models\User;
use App\Models\Employee;
use App\Models\AuditLog;
use App\Models\EmailMessage;
use App\Services\EmailConfigurationService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class EmployeeApiTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->app->make(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
        
        Permission::firstOrCreate(['name' => 'manage_employees']);
        $role = Role::firstOrCreate(['name' => 'admin']);
        $role->givePermissionTo('manage_employees');
        
        Role::firstOrCreate(['name' => 'client']);
        Role::firstOrCreate(['name' => 'super_admin']);
        Role::firstOrCreate(['name' => 'employee']);
        Role::firstOrCreate(['name' => 'manager']);
    }

    protected function adminUser()
    {
        $user = User::factory()->create();
        $user->assignRole('admin');
        return $user;
    }

    public function test_unauthorized_access_denied()
    {
        $response = $this->getJson('/api/v1/employees');
        $response->assertStatus(401);
    }

    public function test_client_denied()
    {
        $user = User::factory()->create();
        $user->assignRole('client');
        $this->actingAs($user);

        $response = $this->getJson('/api/v1/employees');
        $response->assertStatus(403);
    }

    public function test_super_admin_bypass()
    {
        $user = User::factory()->create();
        $user->assignRole('super_admin');
        $this->actingAs($user);

        $response = $this->getJson('/api/v1/employees');
        $response->assertStatus(200);
    }

    public function test_authorized_list_and_pagination()
    {
        Employee::factory()->count(20)->create();
        
        $response = $this->actingAs($this->adminUser())->getJson('/api/v1/employees?per_page=5');
        
        $response->assertStatus(200)
                 ->assertJsonCount(5, 'data')
                 ->assertJsonPath('meta.total', 20);
    }

    public function test_manager_picker_lists_only_active_manager_role_employees()
    {
        $managerRole = Role::firstOrCreate(['name' => 'Manager']);
        $manager = Employee::factory()->create(['status' => 'active']);
        $manager->user->assignRole($managerRole);

        $employee = Employee::factory()->create(['status' => 'active']);
        $employee->user->assignRole('employee');

        $inactiveManager = Employee::factory()->create(['status' => 'inactive']);
        $inactiveManager->user->assignRole($managerRole);

        $response = $this->actingAs($this->adminUser())->getJson('/api/v1/employees/managers');

        $response->assertStatus(200)
            ->assertJsonFragment(['id' => $manager->id])
            ->assertJsonMissing(['id' => $employee->id])
            ->assertJsonMissing(['id' => $inactiveManager->id]);
    }

    public function test_legacy_manager_role_is_returned_as_internal_dashboard_role()
    {
        $managerRole = Role::firstOrCreate(['name' => 'Manager']);
        $user = User::factory()->create([
            'email' => 'legacy.manager@example.com',
            'password' => Hash::make('ManagerPass123!'),
            'status' => 'invited',
        ]);
        $user->assignRole($managerRole);

        $response = $this->postJson('/api/v1/auth/login', [
            'identifier' => 'legacy.manager@example.com',
            'password' => 'ManagerPass123!',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.user.status', 'active')
            ->assertJsonPath('data.user.roles.0', 'manager');
    }

    public function test_create_linked_to_existing_user()
    {
        $user = User::factory()->create();
        
        $response = $this->actingAs($this->adminUser())->postJson('/api/v1/employees', [
            'system_access' => 'link',
            'name' => 'Test Name', 'user_id' => $user->id,
            'job_title' => 'Developer',
            'status' => 'active'
        ]);

        $response->assertStatus(201)
                 ->assertJsonPath('data.job_title', 'Developer');
                 
        $this->assertDatabaseHas('employees', [
            'user_id' => $user->id,
            'job_title' => 'Developer'
        ]);
        
        // Assert audit on create
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'employee.created',
            'subject_type' => Employee::class,
        ]);
    }

    public function test_create_employee_provisions_internal_account_invite()
    {
        $response = $this->actingAs($this->adminUser())->postJson('/api/v1/employees', [
            'system_access' => 'create',
            'name' => 'Staff Member',
            'username' => 'staff.member',
            'email' => 'staff.login@example.com',
            'personal_email' => 'staff.personal@example.com',
            'bank_account_number' => '1234567890123456',
            'national_address' => 'Sensitive employee address',
            'job_title' => 'Operations Executive',
            'status' => 'active',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.user.email', 'staff.login@example.com')
            ->assertJsonPath('data.personal_email', 'staff.personal@example.com');

        $user = User::query()->where('email', 'staff.login@example.com')->firstOrFail();
        $this->assertTrue($user->hasRole('employee'));
        $this->assertTrue((bool) $user->must_change_password);
        $this->assertSame('invited', $user->status->value);
        $this->assertNotSame('staff.login@example.com', $user->password);
        $this->assertFalse(Hash::check('password', $user->password));

        $message = EmailMessage::query()->where('to_address', 'staff.login@example.com')->latest('id')->firstOrFail();
        $this->assertStringContainsString('https://legendarymea.com/dashboard/login', $message->body);
        $this->assertStringContainsString('Access Internal Dashboard', $message->body);
        $this->assertStringNotContainsString('staff.personal@example.com', $message->body);
        $this->assertStringNotContainsString('1234567890123456', $message->body);
        $this->assertStringNotContainsString('Sensitive employee address', $message->body);
    }

    public function test_employee_can_be_published_to_public_team_from_admin_form()
    {
        $user = User::factory()->create([
            'username' => 'public.staff',
            'email' => 'public.staff@example.com',
        ]);

        $response = $this->actingAs($this->adminUser())->postJson('/api/v1/employees', [
            'system_access' => 'link',
            'name' => 'Public Staff',
            'user_id' => $user->id,
            'job_title' => 'Travel Advisor',
            'status' => 'active',
            'show_on_team' => true,
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.show_on_team', true);

        $this->getJson('/api/v1/public/team/public.staff')
            ->assertOk()
            ->assertJsonPath('data.display_name', 'Public Staff');
    }

    public function test_public_team_publication_requires_linked_user_account()
    {
        $response = $this->actingAs($this->adminUser())->postJson('/api/v1/employees', [
            'system_access' => 'none',
            'name' => 'Hidden Staff',
            'status' => 'active',
            'show_on_team' => true,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['show_on_team']);
    }

    public function test_employee_invite_failure_preserves_employee_and_user()
    {
        $this->mock(EmailConfigurationService::class, function ($mock) {
            $mock->shouldReceive('sendEmailMessage')->andThrow(new \RuntimeException('SMTP down'));
            $mock->shouldReceive('safeError')->andReturn('Email delivery failed.');
        });

        $response = $this->actingAs($this->adminUser())->postJson('/api/v1/employees', [
            'system_access' => 'create',
            'name' => 'Invite Failure',
            'username' => 'invite.failure',
            'email' => 'invite.failure@example.com',
            'status' => 'active',
        ]);

        $response->assertStatus(201);

        $user = User::query()->where('email', 'invite.failure@example.com')->firstOrFail();
        $this->assertDatabaseHas('employees', ['user_id' => $user->id]);
        $this->assertSame('failed', $user->account_invite_status);
        $this->assertNotNull($user->account_invite_failed_at);

        $this->app->forgetInstance(EmailConfigurationService::class);
    }

    public function test_employee_account_actions_and_first_login_flow()
    {
        $this->mock(EmailConfigurationService::class, function ($mock) {
            $mock->shouldReceive('sendEmailMessage')->andReturnNull();
        });

        $admin = $this->adminUser();

        $response = $this->actingAs($admin)->postJson('/api/v1/employees', [
            'system_access' => 'create',
            'name' => 'Dashboard Staff',
            'username' => 'dashboard.staff',
            'email' => 'dashboard.staff@example.com',
            'personal_email' => 'dashboard.staff.personal@example.com',
            'status' => 'active',
        ]);

        $response->assertStatus(201);
        $employee = Employee::query()->findOrFail($response->json('data.id'));
        $user = $employee->user()->firstOrFail();
        $temporaryPassword = $this->temporaryPasswordFromLatestEmail($user->email);
        $oldHash = $user->password;

        $this->assertNull($user->company_id);
        $this->assertTrue($user->hasRole('employee'));
        $this->assertSame('sent', $user->account_invite_status);
        $this->assertTrue((bool) $user->must_change_password);

        $this->actingAs($admin)->postJson("/api/v1/employees/{$employee->id}/account/resend-invite")->assertStatus(200);
        $user->refresh();
        $resendPassword = $this->temporaryPasswordFromLatestEmail($user->email);
        $this->assertNotSame($oldHash, $user->password);
        $this->assertTrue((bool) $user->must_change_password);
        $this->assertTrue(Hash::check($resendPassword, $user->password));

        $this->actingAs($admin)->postJson("/api/v1/employees/{$employee->id}/account/reset-password")->assertStatus(200);
        $user->refresh();
        $resetPassword = $this->temporaryPasswordFromLatestEmail($user->email);
        $this->assertTrue(Hash::check($resetPassword, $user->password));
        $this->assertTrue((bool) $user->must_change_password);

        $this->actingAs($admin)->postJson("/api/v1/employees/{$employee->id}/account/disable")->assertStatus(200);
        $user->refresh();
        $this->assertSame('inactive', $user->status->value);
        $this->postJson('/api/v1/auth/login', ['identifier' => $user->email, 'password' => $resetPassword])->assertStatus(403);

        $this->actingAs($admin)->postJson("/api/v1/employees/{$employee->id}/account/enable")->assertStatus(200);
        $user->refresh();
        $this->assertSame('active', $user->status->value);

        $this->postJson('/api/v1/auth/logout')->assertStatus(200);
        $this->postJson('/api/v1/auth/login', ['identifier' => $user->email, 'password' => $resetPassword])
            ->assertStatus(200)
            ->assertJsonPath('data.user.must_change_password', true);

        $this->getJson('/api/v1/employees')->assertStatus(403);

        $newPassword = 'NewSecurePass123!';
        $this->postJson('/api/v1/auth/change-password', [
            'current_password' => $resetPassword,
            'password' => $newPassword,
            'password_confirmation' => $newPassword,
        ])->assertStatus(200)
            ->assertJsonPath('data.user.must_change_password', false);

        $user->refresh();
        $this->assertFalse((bool) $user->must_change_password);
        $this->postJson('/api/v1/auth/logout')->assertStatus(200);
        $this->postJson('/api/v1/auth/login', ['identifier' => $user->email, 'password' => $resetPassword])->assertStatus(401);
        $this->postJson('/api/v1/auth/login', ['identifier' => $user->email, 'password' => $newPassword])->assertStatus(200);

        $this->app->forgetInstance(EmailConfigurationService::class);
    }

    public function test_existing_linked_employee_account_is_not_reset_or_reinvited()
    {
        $user = User::factory()->create([
            'email' => 'existing.employee@example.com',
            'password' => Hash::make('ExistingPass123!'),
            'must_change_password' => false,
            'account_invite_status' => null,
        ]);
        $originalHash = $user->password;

        $response = $this->actingAs($this->adminUser())->postJson('/api/v1/employees', [
            'system_access' => 'link',
            'name' => 'Existing Employee',
            'user_id' => $user->id,
            'personal_email' => 'existing.personal@example.com',
            'status' => 'active',
        ]);

        $response->assertStatus(201);

        $user->refresh();
        $this->assertSame($originalHash, $user->password);
        $this->assertFalse((bool) $user->must_change_password);
        $this->assertNull($user->account_invite_status);
        $this->assertDatabaseMissing('email_messages', ['to_address' => $user->email]);
    }

    public function test_employee_activity_records_do_not_store_credentials_or_sensitive_hr_data()
    {
        $response = $this->actingAs($this->adminUser())->postJson('/api/v1/employees', [
            'system_access' => 'create',
            'name' => 'Activity Safety',
            'username' => 'activity.safety',
            'email' => 'activity.safety@example.com',
            'personal_email' => 'activity.personal@example.com',
            'bank_account_number' => '9999888877776666',
            'national_address' => 'Hidden address',
            'status' => 'active',
        ]);

        $response->assertStatus(201);

        $payload = AuditLog::query()
            ->whereIn('action', ['employee.created', 'employee.employee_user_provisioned', 'employee.employee_invite_sent'])
            ->get()
            ->map(fn (AuditLog $log) => json_encode($log->toArray()))
            ->implode("\n");

        $this->assertStringNotContainsString('9999888877776666', $payload);
        $this->assertStringNotContainsString('Hidden address', $payload);
        $this->assertStringNotContainsString('$2y$', $payload);
    }

    public function test_unique_user_to_employee_relationship()
    {
        $employee = Employee::factory()->create();
        
        $response = $this->actingAs($this->adminUser())->postJson('/api/v1/employees', [
            'system_access' => 'link',
            'name' => 'Test Name', 'user_id' => $employee->user_id,
            'job_title' => 'Developer'
        ]);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['user_id']);
    }

    public function test_generated_employee_code_and_uniqueness()
    {
        $user1 = User::factory()->create();
        $user2 = User::factory()->create();
        
        $this->actingAs($this->adminUser());
        
        $res1 = $this->postJson('/api/v1/employees', ['system_access' => 'link',
            'name' => 'Test Name', 'user_id' => $user1->id]);
        $res2 = $this->postJson('/api/v1/employees', ['system_access' => 'link',
            'name' => 'Test Name', 'user_id' => $user2->id]);
        
        $code1 = $res1->json('data.employee_code');
        $code2 = $res2->json('data.employee_code');
        
        $this->assertStringStartsWith('LM-EMP-', $code1);
        $this->assertNotEquals($code1, $code2);
    }

    public function test_show_and_sensitive_fields_not_exposed()
    {
        $employee = Employee::factory()->create([
            'bank_account_number' => '1234567890',
            'national_address' => 'Private address',
        ]);
        
        $response = $this->actingAs($this->adminUser())->getJson("/api/v1/employees/{$employee->id}");
        
        $response->assertStatus(200)
                 ->assertJsonPath('data.id', $employee->id)
                 ->assertJsonPath('data.bank_account_number_masked', '******7890')
                 ->assertJsonMissingPath('data.bank_account_number')
                 ->assertJsonMissing(['password', 'tokens']);
    }

    public function test_employee_private_documents_can_be_uploaded_and_downloaded()
    {
        Storage::fake('local');

        $employee = Employee::factory()->create();
        $admin = $this->adminUser();

        $identity = UploadedFile::fake()->image('passport.png');
        $this->actingAs($admin)
            ->post("/api/v1/employees/{$employee->id}/identity-document", ['file' => $identity])
            ->assertStatus(200)
            ->assertJsonPath('data.identity_document.original_name', 'passport.png');

        $employee->refresh();
        Storage::disk('local')->assertExists($employee->identity_document_path);

        $document = UploadedFile::fake()->create('bank-letter.pdf', 20, 'application/pdf');
        $response = $this->actingAs($admin)->post("/api/v1/employees/{$employee->id}/documents", [
            'title' => 'Bank letter',
            'document_type' => 'bank',
            'file' => $document,
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.title', 'Bank letter')
            ->assertJsonPath('data.original_name', 'bank-letter.pdf');

        $this->assertDatabaseHas('employee_documents', [
            'employee_id' => $employee->id,
            'title' => 'Bank letter',
            'document_type' => 'bank',
        ]);

        $this->actingAs($admin)
            ->get("/api/v1/employees/{$employee->id}/documents/{$response->json('data.id')}/download")
            ->assertStatus(200);
    }

    public function test_update_with_audit()
    {
        $employee = Employee::factory()->create(['job_title' => 'Junior']);
        
        $response = $this->actingAs($this->adminUser())->patchJson("/api/v1/employees/{$employee->id}", [
            'name' => 'Test Name', 'name' => 'Test Name', 'job_title' => 'Senior'
        ]);

        $response->assertStatus(200)
                 ->assertJsonPath('data.job_title', 'Senior');
                 
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'employee.updated',
            'subject_id' => $employee->id
        ]);
    }

    public function test_soft_delete_and_user_survives()
    {
        $employee = Employee::factory()->create();
        $userId = $employee->user_id;
        
        $response = $this->actingAs($this->adminUser())->deleteJson("/api/v1/employees/{$employee->id}");
        
        $response->assertStatus(200);
        
        $this->assertSoftDeleted('employees', ['id' => $employee->id]);
        $this->assertDatabaseHas('users', ['id' => $userId]);
        
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'employee.deleted',
            'subject_id' => $employee->id
        ]);
    }

    public function test_valid_status_and_invalid_status_rejected()
    {
        $user = User::factory()->create();
        
        // Invalid status
        $response = $this->actingAs($this->adminUser())->postJson('/api/v1/employees', [
            'system_access' => 'link',
            'name' => 'Test Name', 'user_id' => $user->id,
            'status' => 'invalid_status'
        ]);
        $response->assertStatus(422)->assertJsonValidationErrors(['status']);
        
        // Valid status
        $response = $this->postJson('/api/v1/employees', [
            'system_access' => 'link',
            'name' => 'Test Name', 'user_id' => $user->id,
            'status' => 'on_leave'
        ]);
        $response->assertStatus(201)->assertJsonPath('data.status', 'on_leave');
    }

    public function test_manager_relationship_and_self_manager_rejected()
    {
        $employee = Employee::factory()->create();
        
        $response = $this->actingAs($this->adminUser())->patchJson("/api/v1/employees/{$employee->id}", [
            'name' => 'Test Name', 'name' => 'Test Name', 'manager_id' => $employee->id
        ]);
        
        $response->assertStatus(422)->assertJsonValidationErrors(['manager_id']);
    }

    public function test_circular_manager_relationship_rejected()
    {
        $empA = Employee::factory()->create();
        $empB = Employee::factory()->create(['manager_id' => $empA->id]);
        $empC = Employee::factory()->create(['manager_id' => $empB->id]);
        
        // Try to set A's manager to C (A -> C -> B -> A cycle)
        $response = $this->actingAs($this->adminUser())->patchJson("/api/v1/employees/{$empA->id}", [
            'name' => 'Test Name', 'name' => 'Test Name', 'manager_id' => $empC->id
        ]);
        
        $response->assertStatus(422)->assertJsonValidationErrors(['manager_id']);
    }

    public function test_search_and_filters()
    {
        $emp1 = Employee::factory()->create(['department' => 'IT', 'status' => 'active']);
        $emp2 = Employee::factory()->create(['department' => 'HR', 'status' => 'inactive']);
        
        $admin = $this->adminUser();
        
        // Search by User name
        $this->actingAs($admin)
             ->getJson("/api/v1/employees?search=" . $emp1->user->name)
             ->assertStatus(200)
             ->assertJsonPath('data.0.id', $emp1->id);
             
        // Department filter
        $this->actingAs($admin)
             ->getJson("/api/v1/employees?department=HR")
             ->assertStatus(200)
             ->assertJsonPath('data.0.id', $emp2->id);
             
        // Status filter
        $this->actingAs($admin)
             ->getJson("/api/v1/employees?status=inactive")
             ->assertStatus(200)
             ->assertJsonPath('data.0.id', $emp2->id);
    }
    
    public function test_allowed_sorting_and_invalid_sort_rejected()
    {
        $emp1 = Employee::factory()->create(['employee_code' => 'LM-EMP-100']);
        $emp2 = Employee::factory()->create(['employee_code' => 'LM-EMP-200']);
        
        $admin = $this->adminUser();
        
        // Allowed sort
        $res = $this->actingAs($admin)->getJson("/api/v1/employees?sort_by=employee_code&sort_order=desc");
        $res->assertStatus(200)->assertJsonPath('data.0.id', $emp2->id);
        
        // Invalid sort cannot inject (we should just fall back to default if not in allowed list, but let's test if it crashes)
        $res2 = $this->getJson("/api/v1/employees?sort_by=invalid_column");
        $res2->assertStatus(200); // Because it ignores invalid sort and uses default
    }

    private function temporaryPasswordFromLatestEmail(string $email): string
    {
        $message = EmailMessage::query()->where('to_address', $email)->latest('id')->firstOrFail();
        preg_match('/<strong>Temporary password:<\/strong>\s*([^<\s]+)/', $message->body, $matches);

        $this->assertNotEmpty($matches[1] ?? null);

        return html_entity_decode($matches[1]);
    }
}
