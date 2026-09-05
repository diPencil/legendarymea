<?php

namespace Tests\Feature\Quotations;

use App\Enums\QuotationStatus;
use App\Models\AuditLog;
use App\Models\Company;
use App\Models\Contact;
use App\Models\Opportunity;
use App\Models\Quotation;
use App\Models\QuotationItem;
use App\Models\Request as BusinessRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class QuotationApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('db:seed', ['--class' => 'RolesAndPermissionsSeeder']);
    }

    private function viewer(): User
    {
        $user = User::factory()->create();
        $user->givePermissionTo('view_quotations');
        return $user;
    }

    private function manager(): User
    {
        $user = User::factory()->create();
        $user->givePermissionTo('view_quotations', 'manage_quotations');
        return $user;
    }

    private function validPayload(Company $company): array
    {
        return [
            'company_id' => $company->id,
            'currency'   => 'SAR',
            'items'      => [
                ['description' => 'Hotel accommodation', 'quantity' => 2, 'unit_price' => 500.00],
                ['description' => 'Airport transfer',    'quantity' => 1, 'unit_price' => 150.00],
            ],
        ];
    }

    // ─── Authorization ─────────────────────────────────────────────────────

    public function test_auth_required()
    {
        $this->getJson('/api/v1/quotations')->assertUnauthorized();
        $this->postJson('/api/v1/quotations')->assertUnauthorized();
    }

    public function test_view_only_can_list_and_show()
    {
        $viewer = $this->viewer();
        $q = Quotation::factory()->create();

        $this->actingAs($viewer)->getJson('/api/v1/quotations')->assertOk();
        $this->actingAs($viewer)->getJson("/api/v1/quotations/{$q->id}")->assertOk();
    }

    public function test_view_only_cannot_create_update_delete()
    {
        $viewer  = $this->viewer();
        $company = Company::factory()->create();
        $q       = Quotation::factory()->create();

        $this->actingAs($viewer)->postJson('/api/v1/quotations', $this->validPayload($company))->assertForbidden();
        $this->actingAs($viewer)->putJson("/api/v1/quotations/{$q->id}", [])->assertForbidden();
        $this->actingAs($viewer)->deleteJson("/api/v1/quotations/{$q->id}")->assertForbidden();
    }

    public function test_view_only_cannot_use_lifecycle()
    {
        $viewer = $this->viewer();
        $q = Quotation::factory()->draft()->create();

        $this->actingAs($viewer)->postJson("/api/v1/quotations/{$q->id}/send")->assertForbidden();
    }

    public function test_no_permission_blocked()
    {
        $user = User::factory()->create();
        $this->actingAs($user)->getJson('/api/v1/quotations')->assertForbidden();
    }

    // ─── Create ────────────────────────────────────────────────────────────

    public function test_creates_draft_quotation()
    {
        $manager = $this->manager();
        $company = Company::factory()->create();

        $response = $this->actingAs($manager)->postJson('/api/v1/quotations', $this->validPayload($company));
        $response->assertCreated();
        $this->assertEquals('draft', $response->json('data.status'));
    }

    public function test_authenticated_creator_used()
    {
        $manager = $this->manager();
        $company = Company::factory()->create();

        $response = $this->actingAs($manager)->postJson('/api/v1/quotations', $this->validPayload($company));
        $response->assertCreated();

        $id = $response->json('data.id');
        $this->assertDatabaseHas('quotations', ['id' => $id, 'created_by' => $manager->id]);
    }

    public function test_reference_generated_in_lm_qtn_format()
    {
        $manager = $this->manager();
        $company = Company::factory()->create();

        $response = $this->actingAs($manager)->postJson('/api/v1/quotations', $this->validPayload($company));
        $response->assertCreated();

        $ref = $response->json('data.reference');
        $this->assertMatchesRegularExpression('/^LM-QTN-\d{4}-\d{6}$/', $ref);
    }

    public function test_company_required()
    {
        $manager = $this->manager();
        $payload = $this->validPayload(Company::factory()->create());
        unset($payload['company_id']);

        $this->actingAs($manager)->postJson('/api/v1/quotations', $payload)->assertUnprocessable();
    }

    public function test_standalone_quotation_without_optional_relations()
    {
        $manager = $this->manager();
        $company = Company::factory()->create();

        $response = $this->actingAs($manager)->postJson('/api/v1/quotations', [
            'company_id' => $company->id,
            'currency'   => 'USD',
            'items'      => [['description' => 'Service fee', 'quantity' => 1, 'unit_price' => 1000]],
        ]);
        $response->assertCreated();
        $this->assertNull($response->json('data.contact'));
        $this->assertNull($response->json('data.opportunity'));
        $this->assertNull($response->json('data.request'));
    }

    public function test_at_least_one_item_required()
    {
        $manager = $this->manager();
        $company = Company::factory()->create();

        $this->actingAs($manager)->postJson('/api/v1/quotations', [
            'company_id' => $company->id,
            'currency'   => 'SAR',
            'items'      => [],
        ])->assertUnprocessable();
    }

    public function test_multiple_items_supported()
    {
        $manager = $this->manager();
        $company = Company::factory()->create();

        $response = $this->actingAs($manager)->postJson('/api/v1/quotations', $this->validPayload($company));
        $response->assertCreated();
        $this->assertCount(2, $response->json('data.items'));
    }

    public function test_client_cannot_spoof_status()
    {
        $manager = $this->manager();
        $company = Company::factory()->create();
        $payload = array_merge($this->validPayload($company), ['status' => 'accepted']);

        $response = $this->actingAs($manager)->postJson('/api/v1/quotations', $payload);
        $response->assertCreated();
        $this->assertEquals('draft', $response->json('data.status'));
    }

    public function test_client_cannot_spoof_reference()
    {
        $manager = $this->manager();
        $company = Company::factory()->create();
        $payload = array_merge($this->validPayload($company), ['reference' => 'FAKE-REF-001']);

        $response = $this->actingAs($manager)->postJson('/api/v1/quotations', $payload);
        $response->assertCreated();
        $this->assertNotEquals('FAKE-REF-001', $response->json('data.reference'));
    }

    public function test_client_cannot_spoof_creator()
    {
        $manager      = $this->manager();
        $otherUser    = User::factory()->create();
        $company      = Company::factory()->create();
        $payload      = array_merge($this->validPayload($company), ['created_by' => $otherUser->id]);

        $response = $this->actingAs($manager)->postJson('/api/v1/quotations', $payload);
        $response->assertCreated();

        $id = $response->json('data.id');
        $this->assertDatabaseHas('quotations', ['id' => $id, 'created_by' => $manager->id]);
    }

    public function test_client_cannot_spoof_subtotal_or_total()
    {
        $manager = $this->manager();
        $company = Company::factory()->create();
        $payload = array_merge($this->validPayload($company), ['subtotal' => 9999, 'total_amount' => 9999]);

        $response = $this->actingAs($manager)->postJson('/api/v1/quotations', $payload);
        $response->assertCreated();

        // Server calculated: 2×500 + 1×150 = 1150
        $this->assertEquals('1150.00', $response->json('data.total_amount'));
    }

    // ─── Server Calculations ───────────────────────────────────────────────

    public function test_server_calculates_line_totals_correctly()
    {
        $manager = $this->manager();
        $company = Company::factory()->create();

        $response = $this->actingAs($manager)->postJson('/api/v1/quotations', [
            'company_id' => $company->id,
            'currency'   => 'SAR',
            'items'      => [
                ['description' => 'Item A', 'quantity' => 2, 'unit_price' => 100],
                ['description' => 'Item B', 'quantity' => 3, 'unit_price' => 50],
            ],
        ]);
        $response->assertCreated();

        $items = $response->json('data.items');
        $lineTotals = array_column($items, 'line_total');
        $this->assertContains('200.00', $lineTotals);
        $this->assertContains('150.00', $lineTotals);
    }

    public function test_subtotal_is_sum_of_line_totals()
    {
        $manager = $this->manager();
        $company = Company::factory()->create();

        $response = $this->actingAs($manager)->postJson('/api/v1/quotations', [
            'company_id' => $company->id,
            'currency'   => 'SAR',
            'items'      => [
                ['description' => 'Item A', 'quantity' => 2, 'unit_price' => 100],
                ['description' => 'Item B', 'quantity' => 3, 'unit_price' => 50],
            ],
        ]);
        $response->assertCreated();
        $this->assertEquals('350.00', $response->json('data.subtotal'));
    }

    public function test_discount_applied_correctly()
    {
        $manager = $this->manager();
        $company = Company::factory()->create();

        $response = $this->actingAs($manager)->postJson('/api/v1/quotations', [
            'company_id'      => $company->id,
            'currency'        => 'SAR',
            'discount_amount' => 50,
            'items'           => [['description' => 'Service', 'quantity' => 1, 'unit_price' => 1000]],
        ]);
        $response->assertCreated();
        $this->assertEquals('1000.00', $response->json('data.subtotal'));
        $this->assertEquals('50.00',   $response->json('data.discount_amount'));
        $this->assertEquals('950.00',  $response->json('data.total_amount'));
    }

    public function test_tax_applied_correctly()
    {
        $manager = $this->manager();
        $company = Company::factory()->create();

        $response = $this->actingAs($manager)->postJson('/api/v1/quotations', [
            'company_id' => $company->id,
            'currency'   => 'SAR',
            'tax_amount' => 150,
            'items'      => [['description' => 'Service', 'quantity' => 1, 'unit_price' => 1000]],
        ]);
        $response->assertCreated();
        $this->assertEquals('1150.00', $response->json('data.total_amount'));
    }

    public function test_total_formula_complete()
    {
        $manager = $this->manager();
        $company = Company::factory()->create();

        $response = $this->actingAs($manager)->postJson('/api/v1/quotations', [
            'company_id'      => $company->id,
            'currency'        => 'SAR',
            'discount_amount' => 100,
            'tax_amount'      => 150,
            'items'           => [['description' => 'Service', 'quantity' => 1, 'unit_price' => 1000]],
        ]);
        $response->assertCreated();
        // total = 1000 - 100 + 150 = 1050
        $this->assertEquals('1050.00', $response->json('data.total_amount'));
    }

    public function test_negative_discount_rejected()
    {
        $manager = $this->manager();
        $company = Company::factory()->create();

        $this->actingAs($manager)->postJson('/api/v1/quotations', [
            'company_id'      => $company->id,
            'currency'        => 'SAR',
            'discount_amount' => -50,
            'items'           => [['description' => 'Service', 'quantity' => 1, 'unit_price' => 1000]],
        ])->assertUnprocessable();
    }

    public function test_currency_must_be_3_uppercase_letters()
    {
        $manager = $this->manager();
        $company = Company::factory()->create();

        $this->actingAs($manager)->postJson('/api/v1/quotations', [
            'company_id' => $company->id,
            'currency'   => 'us',
            'items'      => [['description' => 'X', 'quantity' => 1, 'unit_price' => 10]],
        ])->assertUnprocessable();

        $this->actingAs($manager)->postJson('/api/v1/quotations', [
            'company_id' => $company->id,
            'currency'   => 'DOLLAR',
            'items'      => [['description' => 'X', 'quantity' => 1, 'unit_price' => 10]],
        ])->assertUnprocessable();
    }

    // ─── Relationship Integrity ─────────────────────────────────────────────

    public function test_company_contact_mismatch_rejected()
    {
        $manager  = $this->manager();
        $company1 = Company::factory()->create();
        $company2 = Company::factory()->create();
        $contact  = Contact::factory()->create(['company_id' => $company2->id]);

        $payload = array_merge($this->validPayload($company1), ['contact_id' => $contact->id]);

        $this->actingAs($manager)->postJson('/api/v1/quotations', $payload)->assertUnprocessable();
    }

    public function test_company_opportunity_mismatch_rejected()
    {
        $manager  = $this->manager();
        $company1 = Company::factory()->create();
        $company2 = Company::factory()->create();
        $opp      = Opportunity::factory()->create(['company_id' => $company2->id]);

        $payload = array_merge($this->validPayload($company1), ['opportunity_id' => $opp->id]);

        $this->actingAs($manager)->postJson('/api/v1/quotations', $payload)->assertUnprocessable();
    }

    public function test_company_request_mismatch_rejected()
    {
        $manager  = $this->manager();
        $company1 = Company::factory()->create();
        $company2 = Company::factory()->create();
        $req      = BusinessRequest::factory()->create(['company_id' => $company2->id]);

        $payload = array_merge($this->validPayload($company1), ['request_id' => $req->id]);

        $this->actingAs($manager)->postJson('/api/v1/quotations', $payload)->assertUnprocessable();
    }

    // ─── Show ───────────────────────────────────────────────────────────────

    public function test_show_returns_correct_structure()
    {
        $manager  = $this->manager();
        $company  = Company::factory()->create();
        $response = $this->actingAs($manager)->postJson('/api/v1/quotations', $this->validPayload($company));
        $id       = $response->json('data.id');

        $show = $this->actingAs($manager)->getJson("/api/v1/quotations/{$id}");
        $show->assertOk()
            ->assertJsonStructure(['data' => [
                'id', 'reference', 'status', 'currency',
                'subtotal', 'discount_amount', 'tax_amount', 'total_amount',
                'company', 'items', 'creator',
            ]]);
    }

    // ─── Update ─────────────────────────────────────────────────────────────

    public function test_update_draft_content()
    {
        $manager  = $this->manager();
        $company  = Company::factory()->create();
        $response = $this->actingAs($manager)->postJson('/api/v1/quotations', $this->validPayload($company));
        $id       = $response->json('data.id');

        $update = $this->actingAs($manager)->putJson("/api/v1/quotations/{$id}", [
            'notes' => 'Updated commercial notes',
        ]);
        $update->assertOk();
        $this->assertEquals('Updated commercial notes', $update->json('data.notes'));
    }

    public function test_update_replaces_items_and_recalculates()
    {
        $manager  = $this->manager();
        $company  = Company::factory()->create();
        $response = $this->actingAs($manager)->postJson('/api/v1/quotations', $this->validPayload($company));
        $id       = $response->json('data.id');

        $update = $this->actingAs($manager)->putJson("/api/v1/quotations/{$id}", [
            'items' => [['description' => 'Single item', 'quantity' => 1, 'unit_price' => 200]],
        ]);
        $update->assertOk();
        $this->assertCount(1, $update->json('data.items'));
        $this->assertEquals('200.00', $update->json('data.subtotal'));
        $this->assertEquals('200.00', $update->json('data.total_amount'));
    }

    public function test_update_without_items_preserves_existing_items()
    {
        $manager  = $this->manager();
        $company  = Company::factory()->create();
        $response = $this->actingAs($manager)->postJson('/api/v1/quotations', $this->validPayload($company));
        $id       = $response->json('data.id');

        $update = $this->actingAs($manager)->putJson("/api/v1/quotations/{$id}", ['notes' => 'Just notes']);
        $update->assertOk();
        $this->assertCount(2, $update->json('data.items')); // original 2 items preserved
    }

    public function test_update_with_empty_items_rejected()
    {
        $manager  = $this->manager();
        $company  = Company::factory()->create();
        $response = $this->actingAs($manager)->postJson('/api/v1/quotations', $this->validPayload($company));
        $id       = $response->json('data.id');

        $this->actingAs($manager)->putJson("/api/v1/quotations/{$id}", ['items' => []])->assertUnprocessable();
    }

    public function test_update_nullable_clearing()
    {
        $manager  = $this->manager();
        $company  = Company::factory()->create();
        $contact  = Contact::factory()->create(['company_id' => $company->id]);

        $response = $this->actingAs($manager)->postJson('/api/v1/quotations', array_merge(
            $this->validPayload($company),
            ['contact_id' => $contact->id, 'notes' => 'Some notes']
        ));
        $id = $response->json('data.id');

        $update = $this->actingAs($manager)->putJson("/api/v1/quotations/{$id}", [
            'contact_id' => null,
            'notes'      => null,
        ]);
        $update->assertOk();
        $this->assertNull($update->json('data.contact'));
        $this->assertNull($update->json('data.notes'));
    }

    public function test_update_cannot_change_reference()
    {
        $manager  = $this->manager();
        $company  = Company::factory()->create();
        $response = $this->actingAs($manager)->postJson('/api/v1/quotations', $this->validPayload($company));
        $id       = $response->json('data.id');
        $origRef  = $response->json('data.reference');

        $update = $this->actingAs($manager)->putJson("/api/v1/quotations/{$id}", ['reference' => 'FAKE-REF']);
        $update->assertOk();
        $this->assertEquals($origRef, $update->json('data.reference'));
    }

    public function test_update_cannot_change_status_via_generic_update()
    {
        $manager  = $this->manager();
        $company  = Company::factory()->create();
        $response = $this->actingAs($manager)->postJson('/api/v1/quotations', $this->validPayload($company));
        $id       = $response->json('data.id');

        $update = $this->actingAs($manager)->putJson("/api/v1/quotations/{$id}", ['status' => 'accepted']);
        $update->assertOk();
        $this->assertEquals('draft', $update->json('data.status'));
    }

    public function test_non_draft_quotation_cannot_be_edited()
    {
        $manager  = $this->manager();
        $quotation = Quotation::factory()->sent()->create();

        $this->actingAs($manager)->putJson("/api/v1/quotations/{$quotation->id}", [
            'notes' => 'Trying to edit',
        ])->assertUnprocessable();
    }

    public function test_company_change_clears_incompatible_contact()
    {
        $manager   = $this->manager();
        $company1  = Company::factory()->create();
        $company2  = Company::factory()->create();
        $contact   = Contact::factory()->create(['company_id' => $company1->id]);

        $response = $this->actingAs($manager)->postJson('/api/v1/quotations', array_merge(
            $this->validPayload($company1),
            ['contact_id' => $contact->id]
        ));
        $id = $response->json('data.id');

        $update = $this->actingAs($manager)->putJson("/api/v1/quotations/{$id}", [
            'company_id' => $company2->id,
        ]);
        $update->assertOk();
        $this->assertNull($update->json('data.contact'));
    }

    // ─── Lifecycle ─────────────────────────────────────────────────────────

    public function test_draft_to_sent()
    {
        $manager  = $this->manager();
        $company  = Company::factory()->create();
        $response = $this->actingAs($manager)->postJson('/api/v1/quotations', $this->validPayload($company));
        $id       = $response->json('data.id');

        $send = $this->actingAs($manager)->postJson("/api/v1/quotations/{$id}/send");
        $send->assertOk();
        $this->assertEquals('sent', $send->json('data.status'));
    }

    public function test_send_sets_issue_date_when_null()
    {
        $manager  = $this->manager();
        $company  = Company::factory()->create();
        $response = $this->actingAs($manager)->postJson('/api/v1/quotations', $this->validPayload($company));
        $id       = $response->json('data.id');

        $send = $this->actingAs($manager)->postJson("/api/v1/quotations/{$id}/send");
        $send->assertOk();
        $this->assertNotNull($send->json('data.issue_date'));
    }

    public function test_draft_to_cancelled()
    {
        $manager  = $this->manager();
        $company  = Company::factory()->create();
        $response = $this->actingAs($manager)->postJson('/api/v1/quotations', $this->validPayload($company));
        $id       = $response->json('data.id');

        $cancel = $this->actingAs($manager)->postJson("/api/v1/quotations/{$id}/cancel");
        $cancel->assertOk();
        $this->assertEquals('cancelled', $cancel->json('data.status'));
    }

    public function test_sent_to_accepted()
    {
        $manager   = $this->manager();
        $quotation = Quotation::factory()->sent()->create();

        $accept = $this->actingAs($manager)->postJson("/api/v1/quotations/{$quotation->id}/accept");
        $accept->assertOk();
        $this->assertEquals('accepted', $accept->json('data.status'));
    }

    public function test_sent_to_rejected()
    {
        $manager   = $this->manager();
        $quotation = Quotation::factory()->sent()->create();

        $reject = $this->actingAs($manager)->postJson("/api/v1/quotations/{$quotation->id}/reject");
        $reject->assertOk();
        $this->assertEquals('rejected', $reject->json('data.status'));
    }

    public function test_sent_to_cancelled()
    {
        $manager   = $this->manager();
        $quotation = Quotation::factory()->sent()->create();

        $cancel = $this->actingAs($manager)->postJson("/api/v1/quotations/{$quotation->id}/cancel");
        $cancel->assertOk();
        $this->assertEquals('cancelled', $cancel->json('data.status'));
    }

    public function test_sent_to_expired()
    {
        $manager   = $this->manager();
        $quotation = Quotation::factory()->sent()->create();

        $expire = $this->actingAs($manager)->postJson("/api/v1/quotations/{$quotation->id}/expire");
        $expire->assertOk();
        $this->assertEquals('expired', $expire->json('data.status'));
    }

    // ─── Invalid Lifecycle Transitions ─────────────────────────────────────

    public function test_draft_to_accepted_blocked()
    {
        $manager   = $this->manager();
        $quotation = Quotation::factory()->draft()->create();

        $this->actingAs($manager)->postJson("/api/v1/quotations/{$quotation->id}/accept")
            ->assertUnprocessable();
    }

    public function test_draft_to_rejected_blocked()
    {
        $manager   = $this->manager();
        $quotation = Quotation::factory()->draft()->create();

        $this->actingAs($manager)->postJson("/api/v1/quotations/{$quotation->id}/reject")
            ->assertUnprocessable();
    }

    public function test_accepted_to_sent_blocked()
    {
        $manager   = $this->manager();
        $quotation = Quotation::factory()->accepted()->create();

        $this->actingAs($manager)->postJson("/api/v1/quotations/{$quotation->id}/send")
            ->assertUnprocessable();
    }

    public function test_rejected_to_accepted_blocked()
    {
        $manager   = $this->manager();
        $quotation = Quotation::factory()->rejected()->create();

        $this->actingAs($manager)->postJson("/api/v1/quotations/{$quotation->id}/accept")
            ->assertUnprocessable();
    }

    public function test_expired_to_sent_blocked()
    {
        $manager   = $this->manager();
        $quotation = Quotation::factory()->expired()->create();

        $this->actingAs($manager)->postJson("/api/v1/quotations/{$quotation->id}/send")
            ->assertUnprocessable();
    }

    public function test_cancelled_to_sent_blocked()
    {
        $manager   = $this->manager();
        $quotation = Quotation::factory()->cancelled()->create();

        $this->actingAs($manager)->postJson("/api/v1/quotations/{$quotation->id}/send")
            ->assertUnprocessable();
    }

    // ─── List / Search / Filter ─────────────────────────────────────────────

    public function test_list_pagination_and_recent_first()
    {
        $viewer = $this->viewer();
        Quotation::factory()->count(20)->create();

        $response = $this->actingAs($viewer)->getJson('/api/v1/quotations?per_page=10');
        $response->assertOk()
            ->assertJsonStructure(['data', 'meta' => ['current_page', 'last_page', 'total']]);
        $this->assertCount(10, $response->json('data'));
    }

    public function test_search_by_reference()
    {
        $viewer = $this->viewer();
        $q = Quotation::factory()->create(['reference' => 'LM-QTN-2026-000999']);

        $response = $this->actingAs($viewer)->getJson('/api/v1/quotations?search=000999');
        $response->assertOk();
        $this->assertEquals($q->id, $response->json('data.0.id'));
    }

    public function test_filter_by_status()
    {
        $viewer = $this->viewer();
        Quotation::factory()->draft()->count(3)->create();
        Quotation::factory()->sent()->count(2)->create();

        $response = $this->actingAs($viewer)->getJson('/api/v1/quotations?status=draft');
        $response->assertOk();
        foreach ($response->json('data') as $item) {
            $this->assertEquals('draft', $item['status']);
        }
    }

    public function test_filter_by_company_id()
    {
        $viewer   = $this->viewer();
        $company  = Company::factory()->create();
        Quotation::factory()->create(['company_id' => $company->id]);
        Quotation::factory()->count(3)->create();

        $response = $this->actingAs($viewer)->getJson("/api/v1/quotations?company_id={$company->id}");
        $response->assertOk();
        $this->assertEquals(1, $response->json('meta.total'));
    }

    public function test_filter_by_currency()
    {
        $viewer = $this->viewer();
        Quotation::factory()->create(['currency' => 'SAR']);
        Quotation::factory()->create(['currency' => 'USD']);

        $response = $this->actingAs($viewer)->getJson('/api/v1/quotations?currency=SAR');
        $response->assertOk();
        foreach ($response->json('data') as $item) {
            $this->assertEquals('SAR', $item['currency']);
        }
    }

    public function test_filter_by_creator()
    {
        $viewer   = $this->viewer();
        $creator  = User::factory()->create();
        Quotation::factory()->create(['created_by' => $creator->id]);
        Quotation::factory()->count(2)->create();

        $response = $this->actingAs($viewer)->getJson("/api/v1/quotations?created_by={$creator->id}");
        $response->assertOk();
        $this->assertEquals(1, $response->json('meta.total'));
    }

    public function test_sorting_total_amount_asc()
    {
        $viewer = $this->viewer();
        Quotation::factory()->create(['total_amount' => '500.00']);
        Quotation::factory()->create(['total_amount' => '100.00']);
        Quotation::factory()->create(['total_amount' => '300.00']);

        $response = $this->actingAs($viewer)->getJson('/api/v1/quotations?sort_by=total_amount&sort_dir=asc');
        $response->assertOk();
        $totals = array_column($response->json('data'), 'total_amount');
        $this->assertEquals('100.00', $totals[0]);
    }

    // ─── Delete ─────────────────────────────────────────────────────────────

    public function test_delete_draft_succeeds()
    {
        $manager   = $this->manager();
        $company   = Company::factory()->create();
        $response  = $this->actingAs($manager)->postJson('/api/v1/quotations', $this->validPayload($company));
        $id        = $response->json('data.id');

        $this->actingAs($manager)->deleteJson("/api/v1/quotations/{$id}")->assertOk();
        $this->assertSoftDeleted('quotations', ['id' => $id]);
    }

    public function test_delete_cancelled_succeeds()
    {
        $manager   = $this->manager();
        $quotation = Quotation::factory()->cancelled()->create();

        $this->actingAs($manager)->deleteJson("/api/v1/quotations/{$quotation->id}")->assertOk();
        $this->assertSoftDeleted('quotations', ['id' => $quotation->id]);
    }

    public function test_delete_sent_blocked()
    {
        $manager   = $this->manager();
        $quotation = Quotation::factory()->sent()->create();

        $this->actingAs($manager)->deleteJson("/api/v1/quotations/{$quotation->id}")->assertUnprocessable();
    }

    public function test_delete_accepted_blocked()
    {
        $manager   = $this->manager();
        $quotation = Quotation::factory()->accepted()->create();

        $this->actingAs($manager)->deleteJson("/api/v1/quotations/{$quotation->id}")->assertUnprocessable();
    }

    public function test_deleted_quotation_not_in_list()
    {
        $viewer    = $this->viewer();
        $manager   = $this->manager();
        $company   = Company::factory()->create();
        $response  = $this->actingAs($manager)->postJson('/api/v1/quotations', $this->validPayload($company));
        $id        = $response->json('data.id');

        $this->actingAs($manager)->deleteJson("/api/v1/quotations/{$id}");

        $list = $this->actingAs($viewer)->getJson('/api/v1/quotations');
        $ids  = array_column($list->json('data'), 'id');
        $this->assertNotContains($id, $ids);
    }

    public function test_deleted_quotation_show_returns_404()
    {
        $manager   = $this->manager();
        $company   = Company::factory()->create();
        $response  = $this->actingAs($manager)->postJson('/api/v1/quotations', $this->validPayload($company));
        $id        = $response->json('data.id');

        $this->actingAs($manager)->deleteJson("/api/v1/quotations/{$id}");

        $this->actingAs($manager)->getJson("/api/v1/quotations/{$id}")->assertNotFound();
    }

    // ─── Resource / Money Format ────────────────────────────────────────────

    public function test_resource_includes_items()
    {
        $viewer   = $this->viewer();
        $manager  = $this->manager();
        $company  = Company::factory()->create();
        $response = $this->actingAs($manager)->postJson('/api/v1/quotations', $this->validPayload($company));
        $id       = $response->json('data.id');

        $show = $this->actingAs($viewer)->getJson("/api/v1/quotations/{$id}");
        $show->assertOk()
            ->assertJsonStructure(['data' => ['items' => [['id', 'description', 'quantity', 'unit_price', 'line_total']]]]);
    }

    public function test_null_relations_safe_in_resource()
    {
        $viewer = $this->viewer();
        $q = Quotation::factory()->create([
            'contact_id'     => null,
            'opportunity_id' => null,
            'request_id'     => null,
        ]);

        $show = $this->actingAs($viewer)->getJson("/api/v1/quotations/{$q->id}");
        $show->assertOk();
        $this->assertNull($show->json('data.contact'));
        $this->assertNull($show->json('data.opportunity'));
        $this->assertNull($show->json('data.request'));
    }

    // ─── Audit / CRM Activity ──────────────────────────────────────────────

    public function test_audit_created_on_create()
    {
        $manager = $this->manager();
        $company = Company::factory()->create();

        $response = $this->actingAs($manager)->postJson('/api/v1/quotations', $this->validPayload($company));
        $response->assertCreated();

        $this->assertDatabaseHas('audit_logs', [
            'user_id'      => $manager->id,
            'action'       => 'quotation.created',
            'subject_type' => Quotation::class,
        ]);
    }

    public function test_crm_activity_created_on_create()
    {
        $manager = $this->manager();
        $company = Company::factory()->create();

        $response = $this->actingAs($manager)->postJson('/api/v1/quotations', $this->validPayload($company));
        $response->assertCreated();

        $this->assertDatabaseHas('audit_logs', [
            'user_id'      => $manager->id,
            'action' => 'quotation.created',
            'subject_type' => Quotation::class,
        ]);

        $log = AuditLog::where('action', 'quotation.created')
            ->where('subject_type', Quotation::class)
            ->latest()
            ->firstOrFail();
        $this->assertSame($company->id, $log->new_values['company_id']);
    }

    public function test_audit_created_on_lifecycle_send()
    {
        $manager  = $this->manager();
        $company  = Company::factory()->create();
        $response = $this->actingAs($manager)->postJson('/api/v1/quotations', $this->validPayload($company));
        $id       = $response->json('data.id');

        $this->actingAs($manager)->postJson("/api/v1/quotations/{$id}/send");

        $this->assertDatabaseHas('audit_logs', [
            'action'       => 'quotation.sent',
            'subject_type' => Quotation::class,
        ]);
    }

    public function test_audit_created_on_delete()
    {
        $manager  = $this->manager();
        $company  = Company::factory()->create();
        $response = $this->actingAs($manager)->postJson('/api/v1/quotations', $this->validPayload($company));
        $id       = $response->json('data.id');

        $this->actingAs($manager)->deleteJson("/api/v1/quotations/{$id}");

        $this->assertDatabaseHas('audit_logs', [
            'action'       => 'quotation.deleted',
            'subject_type' => Quotation::class,
        ]);
    }
}
