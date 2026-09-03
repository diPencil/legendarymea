<?php

namespace Tests\Feature;

use App\Enums\QuotationStatus;
use App\Models\Company;
use App\Models\Contact;
use App\Models\Opportunity;
use App\Models\Quotation;
use App\Models\QuotationItem;
use App\Models\Request;
use App\Models\User;
use App\Policies\QuotationPolicy;
use App\Services\QuotationCalculationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Gate;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class QuotationFoundationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\RolesAndPermissionsSeeder::class);
    }

    // ─── Schema / Persistence ────────────────────────────────────────────────

    public function test_quotation_can_persist()
    {
        $quotation = Quotation::factory()->create();

        $this->assertDatabaseHas('quotations', ['id' => $quotation->id]);
    }

    public function test_reference_format_is_lm_qtn()
    {
        $quotation = Quotation::factory()->create(['reference' => 'LM-QTN-2026-000001']);

        $this->assertMatchesRegularExpression('/^LM-QTN-\d{4}-\d{6}$/', $quotation->reference);
    }

    public function test_reference_must_be_unique()
    {
        Quotation::factory()->create(['reference' => 'LM-QTN-2026-000001']);

        $this->expectException(\Illuminate\Database\QueryException::class);
        Quotation::factory()->create(['reference' => 'LM-QTN-2026-000001']);
    }

    public function test_issue_date_is_nullable()
    {
        $quotation = Quotation::factory()->create(['issue_date' => null]);
        $this->assertNull($quotation->issue_date);
    }

    public function test_valid_until_is_nullable()
    {
        $quotation = Quotation::factory()->create(['valid_until' => null]);
        $this->assertNull($quotation->valid_until);
    }

    public function test_notes_is_nullable()
    {
        $quotation = Quotation::factory()->create(['notes' => null]);
        $this->assertNull($quotation->notes);
    }

    public function test_terms_is_nullable()
    {
        $quotation = Quotation::factory()->create(['terms' => null]);
        $this->assertNull($quotation->terms);
    }

    public function test_currency_persists()
    {
        $quotation = Quotation::factory()->create(['currency' => 'SAR']);
        $this->assertEquals('SAR', $quotation->currency);
    }

    // ─── Status Enum ─────────────────────────────────────────────────────────

    public function test_status_enum_draft()
    {
        $q = Quotation::factory()->draft()->create();
        $this->assertSame(QuotationStatus::DRAFT, $q->status);
    }

    public function test_status_enum_sent()
    {
        $q = Quotation::factory()->sent()->create();
        $this->assertSame(QuotationStatus::SENT, $q->status);
    }

    public function test_status_enum_accepted()
    {
        $q = Quotation::factory()->accepted()->create();
        $this->assertSame(QuotationStatus::ACCEPTED, $q->status);
    }

    public function test_status_enum_rejected()
    {
        $q = Quotation::factory()->rejected()->create();
        $this->assertSame(QuotationStatus::REJECTED, $q->status);
    }

    public function test_status_enum_expired()
    {
        $q = Quotation::factory()->expired()->create();
        $this->assertSame(QuotationStatus::EXPIRED, $q->status);
    }

    public function test_status_enum_cancelled()
    {
        $q = Quotation::factory()->cancelled()->create();
        $this->assertSame(QuotationStatus::CANCELLED, $q->status);
    }

    public function test_status_has_no_approval_status()
    {
        $cases = array_column(QuotationStatus::cases(), 'value');
        $this->assertNotContains('approved', $cases);
        $this->assertNotContains('pending_approval', $cases);
        $this->assertNotContains('under_review', $cases);
        $this->assertCount(6, $cases);
    }

    // ─── Relationships ────────────────────────────────────────────────────────

    public function test_company_relationship_works()
    {
        $company = Company::factory()->create();
        $quotation = Quotation::factory()->create(['company_id' => $company->id]);

        $this->assertInstanceOf(Company::class, $quotation->company);
        $this->assertEquals($company->id, $quotation->company->id);
    }

    public function test_company_is_required_at_db_level()
    {
        $this->expectException(\Illuminate\Database\QueryException::class);
        Quotation::factory()->create(['company_id' => null]);
    }

    public function test_contact_relationship_works()
    {
        $company = Company::factory()->create();
        $contact = Contact::factory()->create(['company_id' => $company->id]);
        $quotation = Quotation::factory()->create([
            'company_id' => $company->id,
            'contact_id' => $contact->id,
        ]);

        $this->assertInstanceOf(Contact::class, $quotation->contact);
        $this->assertEquals($contact->id, $quotation->contact->id);
    }

    public function test_contact_is_optional()
    {
        $quotation = Quotation::factory()->create(['contact_id' => null]);
        $this->assertNull($quotation->contact_id);
        $this->assertNull($quotation->contact);
    }

    public function test_opportunity_relationship_works()
    {
        $company = Company::factory()->create();
        $opportunity = Opportunity::factory()->create(['company_id' => $company->id]);
        $quotation = Quotation::factory()->create([
            'company_id' => $company->id,
            'opportunity_id' => $opportunity->id,
        ]);

        $this->assertInstanceOf(Opportunity::class, $quotation->opportunity);
    }

    public function test_opportunity_is_optional()
    {
        $quotation = Quotation::factory()->create(['opportunity_id' => null]);
        $this->assertNull($quotation->opportunity_id);
    }

    public function test_request_relationship_works()
    {
        $company = Company::factory()->create();
        $request = Request::factory()->create(['company_id' => $company->id]);
        $quotation = Quotation::factory()->create([
            'company_id' => $company->id,
            'request_id' => $request->id,
        ]);

        $this->assertInstanceOf(Request::class, $quotation->request);
    }

    public function test_request_is_optional()
    {
        $quotation = Quotation::factory()->create(['request_id' => null]);
        $this->assertNull($quotation->request_id);
    }

    public function test_creator_relationship_works()
    {
        $user = User::factory()->create();
        $quotation = Quotation::factory()->create(['created_by' => $user->id]);

        $this->assertInstanceOf(User::class, $quotation->creator);
        $this->assertEquals($user->id, $quotation->creator->id);
    }

    // ─── Items ────────────────────────────────────────────────────────────────

    public function test_items_relationship_works()
    {
        $quotation = Quotation::factory()->create();
        QuotationItem::factory()->count(3)->create(['quotation_id' => $quotation->id]);

        $this->assertCount(3, $quotation->items);
    }

    public function test_multiple_items_are_supported()
    {
        $quotation = Quotation::factory()->create();
        QuotationItem::factory()->count(5)->create(['quotation_id' => $quotation->id]);

        $this->assertEquals(5, $quotation->items()->count());
    }

    public function test_item_description_persists()
    {
        $quotation = Quotation::factory()->create();
        $item = QuotationItem::factory()->create([
            'quotation_id' => $quotation->id,
            'description' => 'Hotel accommodation package',
        ]);

        $this->assertDatabaseHas('quotation_items', [
            'quotation_id' => $quotation->id,
            'description' => 'Hotel accommodation package',
        ]);
    }

    public function test_item_quantity_and_unit_price_persist()
    {
        $quotation = Quotation::factory()->create();
        $item = QuotationItem::factory()->create([
            'quotation_id' => $quotation->id,
            'quantity' => '2.00',
            'unit_price' => '100.00',
            'line_total' => '200.00',
        ]);

        $this->assertDatabaseHas('quotation_items', [
            'id' => $item->id,
            'quantity' => '2.00',
            'unit_price' => '100.00',
            'line_total' => '200.00',
        ]);
    }

    public function test_soft_delete_works()
    {
        $quotation = Quotation::factory()->create();
        $id = $quotation->id;

        $quotation->delete();

        $this->assertSoftDeleted('quotations', ['id' => $id]);
        $this->assertNull(Quotation::find($id));
    }

    // ─── Calculation Service ──────────────────────────────────────────────────

    /** @var QuotationCalculationService */
    private QuotationCalculationService $calc;

    protected function setUpCalculation(): void
    {
        $this->calc = new QuotationCalculationService();
    }

    public function test_item_line_total_calculation()
    {
        $calc = new QuotationCalculationService();
        $result = $calc->itemLineTotal(2, 100);
        $this->assertEquals('200', $result);
    }

    public function test_item_line_total_decimal_quantity()
    {
        $calc = new QuotationCalculationService();
        $result = $calc->itemLineTotal('1.5', '200.00');
        $this->assertEquals('300', $result);
    }

    public function test_subtotal_from_multiple_lines()
    {
        $calc = new QuotationCalculationService();
        $lines = [
            ['quantity' => '2', 'unit_price' => '100.00'],
            ['quantity' => '3', 'unit_price' => '50.00'],
            ['quantity' => '1', 'unit_price' => '75.50'],
        ];
        // 200 + 150 + 75.50 = 425.50
        $result = $calc->subtotalFromLines($lines);
        $this->assertEquals('425.5', $result);
    }

    public function test_total_with_discount()
    {
        $calc = new QuotationCalculationService();
        // subtotal 1000, discount 100, tax 0 → total 900
        $result = $calc->total('1000.00', '100.00', '0.00');
        $this->assertEquals('900', $result);
    }

    public function test_total_with_tax()
    {
        $calc = new QuotationCalculationService();
        // subtotal 1000, discount 0, tax 150 → total 1150
        $result = $calc->total('1000.00', '0.00', '150.00');
        $this->assertEquals('1150', $result);
    }

    public function test_total_formula_complete()
    {
        $calc = new QuotationCalculationService();
        // subtotal 1000, discount 100, tax 150 → total 1050
        $result = $calc->total('1000.00', '100.00', '150.00');
        $this->assertEquals('1050', $result);
    }

    public function test_total_cannot_be_negative()
    {
        $calc = new QuotationCalculationService();
        // discount larger than subtotal+tax → clamped to 0
        $result = $calc->total('100.00', '500.00', '0.00');
        $this->assertEquals('0', $result);
    }

    public function test_no_float_precision_error()
    {
        $calc = new QuotationCalculationService();
        // Classic 0.1 + 0.2 float issue
        $result = $calc->itemLineTotal('0.1', '3.00');
        $this->assertEquals('0.3', $result);
    }

    public function test_subtotal_from_persisted_items()
    {
        $calc = new QuotationCalculationService();
        $quotation = Quotation::factory()->create();
        QuotationItem::factory()->create([
            'quotation_id' => $quotation->id,
            'quantity' => '2.00',
            'unit_price' => '100.00',
            'line_total' => '200.00',
        ]);
        QuotationItem::factory()->create([
            'quotation_id' => $quotation->id,
            'quantity' => '3.00',
            'unit_price' => '50.00',
            'line_total' => '150.00',
        ]);

        $subtotal = $calc->subtotalFromItems($quotation->items);
        $this->assertEquals('350', $subtotal);
    }

    // ─── Permissions ─────────────────────────────────────────────────────────

    public function test_view_quotations_permission_exists()
    {
        $this->assertNotNull(Permission::findByName('view_quotations', 'web'));
    }

    public function test_manage_quotations_permission_exists()
    {
        $this->assertNotNull(Permission::findByName('manage_quotations', 'web'));
    }

    public function test_no_approve_quotations_permission_exists()
    {
        $this->assertNull(Permission::where('name', 'approve_quotations')->first());
    }

    // ─── Policy ───────────────────────────────────────────────────────────────

    public function test_policy_viewAny_requires_view_quotations()
    {
        $policy = new QuotationPolicy();

        $viewer = User::factory()->create();
        $viewer->givePermissionTo('view_quotations');

        $denied = User::factory()->create();

        $this->assertTrue($policy->viewAny($viewer));
        $this->assertFalse($policy->viewAny($denied));
    }

    public function test_policy_create_requires_manage_quotations()
    {
        $policy = new QuotationPolicy();

        $manager = User::factory()->create();
        $manager->givePermissionTo('manage_quotations');

        $viewer = User::factory()->create();
        $viewer->givePermissionTo('view_quotations');

        $this->assertTrue($policy->create($manager));
        $this->assertFalse($policy->create($viewer));
    }

    public function test_policy_update_requires_manage_quotations()
    {
        $policy = new QuotationPolicy();
        $quotation = Quotation::factory()->create();

        $manager = User::factory()->create();
        $manager->givePermissionTo('manage_quotations');

        $this->assertTrue($policy->update($manager, $quotation));
    }

    public function test_policy_delete_requires_manage_quotations()
    {
        $policy = new QuotationPolicy();
        $quotation = Quotation::factory()->create();

        $manager = User::factory()->create();
        $manager->givePermissionTo('manage_quotations');

        $denied = User::factory()->create();

        $this->assertTrue($policy->delete($manager, $quotation));
        $this->assertFalse($policy->delete($denied, $quotation));
    }
}
