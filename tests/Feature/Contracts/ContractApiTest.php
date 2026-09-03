<?php

namespace Tests\Feature\Contracts;

use App\Models\Company;
use App\Models\Contact;
use App\Models\Contract;
use App\Models\Quotation;
use App\Models\User;
use App\Enums\ContractStatus;
use App\Services\ContractPdfFile;
use App\Services\ContractPdfGenerator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ContractApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\RolesAndPermissionsSeeder::class);
    }

    public function test_auth_required()
    {
        $this->getJson('/api/v1/contracts')->assertUnauthorized();
    }

    public function test_permission_required_for_list_and_show()
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $contract = Contract::factory()->create();

        $this->getJson('/api/v1/contracts')->assertForbidden();
        $this->getJson("/api/v1/contracts/{$contract->id}")->assertForbidden();

        $user->givePermissionTo('view_contracts');

        $this->getJson('/api/v1/contracts')->assertOk();
        $this->getJson("/api/v1/contracts/{$contract->id}")->assertOk();
    }

    public function test_view_only_cannot_mutate()
    {
        $user = User::factory()->create();
        $user->givePermissionTo('view_contracts');
        $this->actingAs($user);

        $company = Company::factory()->create();
        $contract = Contract::factory()->create();

        $this->postJson('/api/v1/contracts', ['title' => 'Title', 'company_id' => $company->id])->assertForbidden();
        $this->putJson("/api/v1/contracts/{$contract->id}", ['title' => 'Title 2'])->assertForbidden();
        $this->deleteJson("/api/v1/contracts/{$contract->id}")->assertForbidden();
        $this->postJson("/api/v1/contracts/{$contract->id}/activate")->assertForbidden();
    }

    public function test_creates_draft_with_generated_reference_and_authenticated_creator()
    {
        $user = User::factory()->create();
        $user->givePermissionTo('manage_contracts');
        $this->actingAs($user);

        $company = Company::factory()->create();

        $response = $this->postJson('/api/v1/contracts', [
            'title' => 'New Services Agreement',
            'company_id' => $company->id,
            'reference' => 'SPOOFED-REF',
            'status' => 'active',
            'created_by' => 999
        ]);

        $response->assertCreated();
        $this->assertNotEquals('SPOOFED-REF', $response->json('data.reference'));
        $this->assertEquals('draft', $response->json('data.status'));
        $this->assertEquals($user->id, $response->json('data.creator.id'));
    }

    public function test_default_template_route_uses_contract_permissions()
    {
        $this->getJson('/api/v1/contracts/default-template')->assertUnauthorized();

        $user = User::factory()->create();
        $this->actingAs($user);
        $this->getJson('/api/v1/contracts/default-template')->assertForbidden();

        $user->givePermissionTo('view_contracts');

        $response = $this->getJson('/api/v1/contracts/default-template');

        $response->assertOk();
        $this->assertSame([
            'parties',
            'preamble',
            'handling_mechanism',
            'sale_policies',
            'confirmation_of_services',
            'cancellation_policy',
            'payment_and_credit',
            'payment_continuation',
            'bank_details',
            'final_acknowledgement',
            'signatures',
        ], collect($response->json('data'))->pluck('key')->all());
        $this->assertSame([1, 2, 3, 4, 5, 6, 7], collect($response->json('data'))->pluck('page')->unique()->values()->all());
        $this->assertFalse(isset($response->json('data.0')['sections']));
        $templateJson = json_encode($response->json('data'), JSON_UNESCAPED_UNICODE);
        $this->assertStringContainsString('Legendary', $templateJson);
        $this->assertStringContainsString('Trip In Click', $templateJson);
        $this->assertStringContainsString('MUMAIAZ NO: 22591310', $templateJson);
    }

    public function test_contract_pdf_download_is_protected_and_returns_pdf()
    {
        $contract = Contract::factory()->create(['reference' => 'LM-CTR-2026-000123']);

        $this->getJson("/api/v1/contracts/{$contract->id}/download-pdf")->assertUnauthorized();

        $user = User::factory()->create();
        $this->actingAs($user);
        $this->get("/api/v1/contracts/{$contract->id}/download-pdf")->assertForbidden();

        $user->givePermissionTo('view_contracts');
        $this->fakeContractPdfGenerator();

        $response = $this->get("/api/v1/contracts/{$contract->id}/download-pdf");

        $response->assertOk();
        $response->assertHeader('Content-Type', 'application/pdf');
        $this->assertStringContainsString(
            'filename="LM-CTR-2026-000123.pdf"',
            $response->headers->get('Content-Disposition')
        );
        $this->assertStringStartsWith('%PDF-1.4', $response->getContent());
    }

    public function test_contract_pdf_download_missing_contract_returns_404()
    {
        $user = User::factory()->create();
        $user->givePermissionTo('view_contracts');
        $this->actingAs($user);

        $this->get('/api/v1/contracts/999999/download-pdf')->assertNotFound();
    }

    public function test_contract_pdf_download_uses_saved_contract_snapshot()
    {
        $user = User::factory()->create();
        $user->givePermissionTo('manage_contracts');
        $this->actingAs($user);

        $company = Company::factory()->create();
        $snapshot = \App\Services\LegendaryContractTemplate::getDefaultTemplate();
        $snapshot[0]['clauses'][0]['en'] = 'Saved snapshot used for PDF only.';

        $create = $this->postJson('/api/v1/contracts', [
            'title' => 'PDF Snapshot Agreement',
            'company_id' => $company->id,
            'contract_content' => $snapshot,
        ])->assertCreated();

        $captured = new class {
            public ?array $content = null;
        };
        $this->fakeContractPdfGenerator($captured);

        $this->get("/api/v1/contracts/{$create->json('data.id')}/download-pdf")->assertOk();

        $this->assertSame('Saved snapshot used for PDF only.', $captured->content[0]['clauses'][0]['en']);
    }

    public function test_contract_content_snapshot_is_created_and_updated()
    {
        $user = User::factory()->create();
        $user->givePermissionTo('manage_contracts');
        $this->actingAs($user);

        $company = Company::factory()->create();

        $response = $this->postJson('/api/v1/contracts', [
            'title' => 'Snapshot Services Agreement',
            'company_id' => $company->id,
        ]);

        $response->assertCreated();
        $this->assertNotEmpty($response->json('data.contract_content'));

        $contract = Contract::findOrFail($response->json('data.id'));
        $content = $contract->contract_content;
        $content[0]['clauses'][0]['en'] = 'Edited only for this contract.';

        $update = $this->putJson("/api/v1/contracts/{$contract->id}", [
            'contract_content' => $content,
        ]);

        $update->assertOk();
        $this->assertSame('Edited only for this contract.', $update->json('data.contract_content.0.clauses.0.en'));
        $this->assertSame('Edited only for this contract.', $contract->fresh()->contract_content[0]['clauses'][0]['en']);
    }

    private function fakeContractPdfGenerator(?object $captured = null): void
    {
        $captured ??= new class {
            public ?array $content = null;
        };

        $this->app->bind(ContractPdfGenerator::class, function () use ($captured) {
            return new class($captured) extends ContractPdfGenerator {
                public function __construct(private readonly object $captured) {}

                public function generate(Contract $contract): ContractPdfFile
                {
                    $this->captured->content = $contract->contract_content;

                    return new ContractPdfFile($this->filename($contract), "%PDF-1.4\n%fake contract\n");
                }

                public function filename(Contract $contract): string
                {
                    return preg_replace('/[^A-Za-z0-9._-]+/', '-', $contract->reference) . '.pdf';
                }
            };
        });
    }

    public function test_contract_content_roundtrips_without_legal_text_mutation()
    {
        $user = User::factory()->create();
        $user->givePermissionTo('manage_contracts');
        $this->actingAs($user);

        $company = Company::factory()->create();
        $template = \App\Services\LegendaryContractTemplate::getDefaultTemplate();

        $create = $this->postJson('/api/v1/contracts', [
            'title' => 'Roundtrip Agreement',
            'company_id' => $company->id,
            'contract_content' => $template,
        ]);

        $create->assertCreated();
        $contract = Contract::findOrFail($create->json('data.id'));
        $before = $contract->contract_content;

        $show = $this->getJson("/api/v1/contracts/{$contract->id}");
        $show->assertOk();
        $this->assertSame($before, $show->json('data.contract_content'));

        $update = $this->putJson("/api/v1/contracts/{$contract->id}", [
            'contract_content' => $show->json('data.contract_content'),
        ]);

        $update->assertOk();
        $after = $contract->fresh()->contract_content;

        $this->assertCount(11, $before);
        $this->assertCount(11, $after);
        $this->assertSame(
            collect($before)->sum(fn ($section) => count($section['clauses'] ?? [])),
            collect($after)->sum(fn ($section) => count($section['clauses'] ?? []))
        );
        $this->assertSame($before, $after);
    }

    public function test_custom_snapshot_does_not_mutate_default_template_or_other_contracts()
    {
        $user = User::factory()->create();
        $user->givePermissionTo('manage_contracts');
        $this->actingAs($user);

        $company = Company::factory()->create();

        $first = $this->postJson('/api/v1/contracts', [
            'title' => 'First Agreement',
            'company_id' => $company->id,
        ])->assertCreated();

        $second = $this->postJson('/api/v1/contracts', [
            'title' => 'Second Agreement',
            'company_id' => $company->id,
        ])->assertCreated();

        $contractA = Contract::findOrFail($first->json('data.id'));
        $contractB = Contract::findOrFail($second->json('data.id'));
        $modified = $contractA->contract_content;
        $modified[0]['clauses'][0]['en'] = 'Only Contract A changed.';

        $this->putJson("/api/v1/contracts/{$contractA->id}", [
            'contract_content' => $modified,
        ])->assertOk();

        $this->assertSame('Only Contract A changed.', $contractA->fresh()->contract_content[0]['clauses'][0]['en']);
        $this->assertNotSame('Only Contract A changed.', $contractB->fresh()->contract_content[0]['clauses'][0]['en']);
        $this->assertNotSame('Only Contract A changed.', \App\Services\LegendaryContractTemplate::getDefaultTemplate()[0]['clauses'][0]['en']);
    }

    public function test_null_and_legacy_nested_snapshots_return_normalized_content()
    {
        $user = User::factory()->create();
        $user->givePermissionTo('view_contracts');
        $this->actingAs($user);

        $nullSnapshot = Contract::factory()->create(['contract_content' => null]);
        $nullResponse = $this->getJson("/api/v1/contracts/{$nullSnapshot->id}");
        $nullResponse->assertOk();
        $this->assertSame('parties', $nullResponse->json('data.contract_content.0.key'));
        $this->assertSame(1, $nullResponse->json('data.contract_content.0.page'));

        $legacy = Contract::factory()->create([
            'contract_content' => [
                [
                    'page' => 7,
                    'sections' => [
                        [
                            'key' => 'signatures',
                            'title_en' => 'Signatures',
                            'title_ar' => 'التوقيعات',
                            'clauses' => [
                                ['en' => 'First Party', 'ar' => 'الطرف الأول'],
                            ],
                        ],
                    ],
                ],
            ],
        ]);

        $legacyResponse = $this->getJson("/api/v1/contracts/{$legacy->id}");
        $legacyResponse->assertOk();
        $this->assertSame('signatures', $legacyResponse->json('data.contract_content.0.key'));
        $this->assertSame(7, $legacyResponse->json('data.contract_content.0.page'));
        $this->assertSame('signatures', $legacyResponse->json('data.contract_content.0.kind'));
        $this->assertArrayNotHasKey('sections', $legacyResponse->json('data.contract_content.0'));
    }

    public function test_update_company_clears_stale_contact_and_quotation_when_not_resubmitted()
    {
        $user = User::factory()->create();
        $user->givePermissionTo('manage_contracts');
        $this->actingAs($user);

        $oldCompany = Company::factory()->create();
        $newCompany = Company::factory()->create();
        $contact = Contact::factory()->create(['company_id' => $oldCompany->id]);
        $quotation = Quotation::factory()->create([
            'company_id' => $oldCompany->id,
            'status' => \App\Enums\QuotationStatus::ACCEPTED,
        ]);
        $contract = Contract::factory()->create([
            'company_id' => $oldCompany->id,
            'contact_id' => $contact->id,
            'quotation_id' => $quotation->id,
        ]);

        $this->putJson("/api/v1/contracts/{$contract->id}", [
            'company_id' => $newCompany->id,
        ])->assertOk();

        $contract->refresh();
        $this->assertSame($newCompany->id, $contract->company_id);
        $this->assertNull($contract->contact_id);
        $this->assertNull($contract->quotation_id);
    }

    public function test_malformed_contract_content_is_rejected()
    {
        $user = User::factory()->create();
        $user->givePermissionTo('manage_contracts');
        $this->actingAs($user);

        $company = Company::factory()->create();

        $this->postJson('/api/v1/contracts', [
            'title' => 'Malformed Agreement',
            'company_id' => $company->id,
            'contract_content' => [
                ['page' => 1, 'sections' => []],
            ],
        ])->assertJsonValidationErrors(['contract_content.0.key', 'contract_content.0.title_en', 'contract_content.0.title_ar', 'contract_content.0.clauses']);
    }

    public function test_company_required_and_standalone_contract_valid()
    {
        $user = User::factory()->create();
        $user->givePermissionTo('manage_contracts');
        $this->actingAs($user);

        $this->postJson('/api/v1/contracts', [
            'title' => 'New Services Agreement'
        ])->assertJsonValidationErrors('company_id');

        $company = Company::factory()->create();
        $this->postJson('/api/v1/contracts', [
            'title' => 'New Services Agreement',
            'company_id' => $company->id,
        ])->assertCreated();
    }

    public function test_optional_contact_and_quotation_valid()
    {
        $user = User::factory()->create();
        $user->givePermissionTo('manage_contracts');
        $this->actingAs($user);

        $company = Company::factory()->create();
        $contact = Contact::factory()->create(['company_id' => $company->id]);
        $quotation = Quotation::factory()->create([
            'company_id' => $company->id,
            'status' => \App\Enums\QuotationStatus::ACCEPTED
        ]);

        $response = $this->postJson('/api/v1/contracts', [
            'title' => 'New Services Agreement',
            'company_id' => $company->id,
            'contact_id' => $contact->id,
            'quotation_id' => $quotation->id,
        ]);

        $response->assertCreated();
        $this->assertEquals($contact->id, $response->json('data.contact.id'));
        $this->assertEquals($quotation->id, $response->json('data.quotation.id'));
    }

    public function test_non_accepted_linked_quotation_rejected()
    {
        $user = User::factory()->create();
        $user->givePermissionTo('manage_contracts');
        $this->actingAs($user);

        $company = Company::factory()->create();
        $quotation = Quotation::factory()->create([
            'company_id' => $company->id,
            'status' => \App\Enums\QuotationStatus::DRAFT
        ]);

        $this->postJson('/api/v1/contracts', [
            'title' => 'New Services Agreement',
            'company_id' => $company->id,
            'quotation_id' => $quotation->id,
        ])->assertJsonValidationErrors('quotation_id');
    }

    public function test_cross_company_contact_and_quotation_rejected()
    {
        $user = User::factory()->create();
        $user->givePermissionTo('manage_contracts');
        $this->actingAs($user);

        $company1 = Company::factory()->create();
        $company2 = Company::factory()->create();
        
        $contact = Contact::factory()->create(['company_id' => $company2->id]);
        $quotation = Quotation::factory()->create([
            'company_id' => $company2->id,
            'status' => \App\Enums\QuotationStatus::ACCEPTED
        ]);

        $this->postJson('/api/v1/contracts', [
            'title' => 'New Services Agreement',
            'company_id' => $company1->id,
            'contact_id' => $contact->id,
        ])->assertJsonValidationErrors('contact_id');

        $this->postJson('/api/v1/contracts', [
            'title' => 'New Services Agreement',
            'company_id' => $company1->id,
            'quotation_id' => $quotation->id,
        ])->assertJsonValidationErrors('quotation_id');
    }

    public function test_value_and_currency_validation()
    {
        $user = User::factory()->create();
        $user->givePermissionTo('manage_contracts');
        $this->actingAs($user);
        $company = Company::factory()->create();

        // Null value + null currency valid
        $this->postJson('/api/v1/contracts', [
            'title' => 'Title',
            'company_id' => $company->id,
            'contract_value' => null,
            'currency' => null,
        ])->assertCreated();

        // Decimal value persists accurately
        $response = $this->postJson('/api/v1/contracts', [
            'title' => 'Title',
            'company_id' => $company->id,
            'contract_value' => '15000.55',
            'currency' => 'SAR',
        ]);
        $response->assertCreated();
        $this->assertEquals('15000.55', $response->json('data.contract_value'));

        // Negative value rejected
        $this->postJson('/api/v1/contracts', [
            'title' => 'Title',
            'company_id' => $company->id,
            'contract_value' => -100,
            'currency' => 'SAR',
        ])->assertJsonValidationErrors('contract_value');

        // Value without currency rejected
        $this->postJson('/api/v1/contracts', [
            'title' => 'Title',
            'company_id' => $company->id,
            'contract_value' => 100,
        ])->assertJsonValidationErrors('currency');
        
        // Canonical currency validation
        $this->postJson('/api/v1/contracts', [
            'title' => 'Title',
            'company_id' => $company->id,
            'contract_value' => 100,
            'currency' => 'SARR', // Invalid size
        ])->assertJsonValidationErrors('currency');

        $this->postJson('/api/v1/contracts', [
            'title' => 'Title',
            'company_id' => $company->id,
            'contract_value' => 100,
            'currency' => 'XXX',
        ])->assertJsonValidationErrors('currency');
    }

    public function test_dates_validation()
    {
        $user = User::factory()->create();
        $user->givePermissionTo('manage_contracts');
        $this->actingAs($user);
        $company = Company::factory()->create();

        // Nullable dates valid
        $this->postJson('/api/v1/contracts', [
            'title' => 'Title',
            'company_id' => $company->id,
            'start_date' => null,
            'end_date' => null,
        ])->assertCreated();

        // Valid date range works
        $this->postJson('/api/v1/contracts', [
            'title' => 'Title',
            'company_id' => $company->id,
            'start_date' => '2026-01-01',
            'end_date' => '2026-12-31',
        ])->assertCreated();

        // End before start rejected
        $this->postJson('/api/v1/contracts', [
            'title' => 'Title',
            'company_id' => $company->id,
            'start_date' => '2026-12-31',
            'end_date' => '2026-01-01',
        ])->assertJsonValidationErrors('end_date');
    }

    public function test_draft_update_works_with_nullable_clearing()
    {
        $user = User::factory()->create();
        $user->givePermissionTo('manage_contracts');
        $this->actingAs($user);
        
        $contract = Contract::factory()->create([
            'title' => 'Old Title',
            'contract_value' => 1000,
            'currency' => 'SAR'
        ]);

        $response = $this->putJson("/api/v1/contracts/{$contract->id}", [
            'title' => 'New Title',
            'contract_value' => null,
            'currency' => null,
        ]);
        
        $response->assertOk();
        $this->assertEquals('New Title', $response->json('data.title'));
        $this->assertNull($response->json('data.contract_value'));
        $this->assertNull($response->json('data.currency'));
    }

    public function test_draft_to_active_via_update_uses_lifecycle()
    {
        $user = User::factory()->create();
        $user->givePermissionTo('manage_contracts');
        $this->actingAs($user);
        
        $draft = Contract::factory()->create();
        $response = $this->putJson("/api/v1/contracts/{$draft->id}", ['status' => 'active']);

        $response->assertOk();
        $response->assertJsonPath('data.status', 'active');
        $this->assertEquals('active', $draft->fresh()->status->value);
    }

    public function test_active_to_draft_via_update_uses_lifecycle()
    {
        $user = User::factory()->create();
        $user->givePermissionTo('manage_contracts');
        $this->actingAs($user);

        $active = Contract::factory()->active()->create();
        $response = $this->putJson("/api/v1/contracts/{$active->id}", ['status' => 'draft']);

        $response->assertOk();
        $response->assertJsonPath('data.status', 'draft');
        $this->assertEquals('draft', $active->fresh()->status->value);
    }

    public function test_non_draft_update_requires_explicit_revert()
    {
        $user = User::factory()->create();
        $user->givePermissionTo('manage_contracts');
        $this->actingAs($user);

        $active = Contract::factory()->active()->create();
        $this->putJson("/api/v1/contracts/{$active->id}", ['title' => 'New Title'])
            ->assertJsonValidationErrors('status');
    }

    public function test_lifecycle_transitions()
    {
        $user = User::factory()->create();
        $user->givePermissionTo('manage_contracts');
        $this->actingAs($user);
        
        // draft -> active PASS
        $draft1 = Contract::factory()->create(['title' => 'Valid', 'contract_value' => 100, 'currency' => 'SAR']);
        $this->postJson("/api/v1/contracts/{$draft1->id}/activate")->assertOk();
        $this->assertEquals('active', $draft1->fresh()->status->value);
        
        // draft -> cancelled PASS
        $draft2 = Contract::factory()->create();
        $this->postJson("/api/v1/contracts/{$draft2->id}/cancel")->assertOk();
        $this->assertEquals('cancelled', $draft2->fresh()->status->value);

        // active -> expired PASS
        $active1 = Contract::factory()->active()->create();
        $this->postJson("/api/v1/contracts/{$active1->id}/expire")->assertOk();
        $this->assertEquals('expired', $active1->fresh()->status->value);

        // active -> terminated PASS
        $active2 = Contract::factory()->active()->create();
        $this->postJson("/api/v1/contracts/{$active2->id}/terminate")->assertOk();
        $this->assertEquals('terminated', $active2->fresh()->status->value);
    }

    public function test_invalid_lifecycle_transitions_blocked()
    {
        $user = User::factory()->create();
        $user->givePermissionTo('manage_contracts');
        $this->actingAs($user);
        
        $draft = Contract::factory()->create();
        $active = Contract::factory()->active()->create();
        $expired = Contract::factory()->expired()->create();
        $terminated = Contract::factory()->terminated()->create();
        $cancelled = Contract::factory()->cancelled()->create();

        // draft -> expired blocked
        $this->postJson("/api/v1/contracts/{$draft->id}/expire")->assertJsonValidationErrors('status');
        
        // draft -> terminated blocked
        $this->postJson("/api/v1/contracts/{$draft->id}/terminate")->assertJsonValidationErrors('status');

        // active -> cancelled blocked
        $this->postJson("/api/v1/contracts/{$active->id}/cancel")->assertJsonValidationErrors('status');

        // expired -> active blocked
        $this->postJson("/api/v1/contracts/{$expired->id}/activate")->assertJsonValidationErrors('status');

        // terminated -> active blocked
        $this->postJson("/api/v1/contracts/{$terminated->id}/activate")->assertJsonValidationErrors('status');

        // cancelled -> active blocked
        $this->postJson("/api/v1/contracts/{$cancelled->id}/activate")->assertJsonValidationErrors('status');
    }

    public function test_delete_rules()
    {
        $user = User::factory()->create();
        $user->givePermissionTo('manage_contracts');
        $this->actingAs($user);
        
        $draft = Contract::factory()->create();
        $this->deleteJson("/api/v1/contracts/{$draft->id}")->assertNoContent();
        
        $cancelled = Contract::factory()->cancelled()->create();
        $this->deleteJson("/api/v1/contracts/{$cancelled->id}")->assertNoContent();

        $active = Contract::factory()->active()->create();
        $this->deleteJson("/api/v1/contracts/{$active->id}")->assertForbidden();

        $expired = Contract::factory()->expired()->create();
        $this->deleteJson("/api/v1/contracts/{$expired->id}")->assertForbidden();

        $terminated = Contract::factory()->terminated()->create();
        $this->deleteJson("/api/v1/contracts/{$terminated->id}")->assertForbidden();
    }

    public function test_list_pagination_search_filters_sorting()
    {
        $user = User::factory()->create();
        $user->givePermissionTo('view_contracts');
        $this->actingAs($user);

        Contract::factory()->create(['title' => 'Alpha', 'status' => 'draft']);
        Contract::factory()->create(['title' => 'Beta', 'status' => 'active']);

        $response = $this->getJson('/api/v1/contracts');
        $response->assertOk();
        $this->assertCount(2, $response->json('data'));
        
        // Filter by status
        $response = $this->getJson('/api/v1/contracts?status=active');
        $this->assertCount(1, $response->json('data'));
        $this->assertEquals('Beta', $response->json('data.0.title'));

        // Search
        $response = $this->getJson('/api/v1/contracts?search=Alpha');
        $this->assertCount(1, $response->json('data'));
        $this->assertEquals('Alpha', $response->json('data.0.title'));
    }
}
