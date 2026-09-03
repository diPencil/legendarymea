<?php

namespace Tests\Feature;

use App\Enums\ServiceInterest;
use App\Models\ServiceCatalog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class ServiceCatalogTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\ServiceCatalogSeeder::class);
    }

    public function test_catalog_contains_existing_service_interest_options(): void
    {
        foreach (ServiceInterest::values() as $code) {
            $this->assertDatabaseHas('service_catalogs', [
                'code' => $code,
                'active' => true,
                'show_in_contact' => true,
            ]);
        }
    }

    public function test_tourism_and_invoice_services_are_available_for_invoice_and_active_service(): void
    {
        $invoiceCodes = [
            'hotels_accommodation',
            'flight_arrangements',
            'transfers',
            'car_rental',
            'tours_experiences',
            'groups_special_requests',
            'corporate_travel',
            'hospitality_solutions',
            'taxidia_b2b_platform',
        ];

        foreach ($invoiceCodes as $code) {
            $this->assertDatabaseHas('service_catalogs', [
                'code' => $code,
                'active' => true,
                'available_for_invoice' => true,
                'available_for_active_service' => true,
            ]);
        }

        foreach (['partnership', 'general_business'] as $code) {
            $this->assertDatabaseHas('service_catalogs', [
                'code' => $code,
                'active' => true,
                'show_in_contact' => true,
                'available_for_invoice' => false,
                'available_for_active_service' => false,
            ]);
        }
    }

    public function test_public_catalog_endpoint_filters_by_flags(): void
    {
        $contact = $this->getJson('/api/v1/public/services?show_in_contact=1&active=1')
            ->assertOk()
            ->json('data');

        $invoice = $this->getJson('/api/v1/public/services?available_for_invoice=1&active=1')
            ->assertOk()
            ->json('data');

        $activeService = $this->getJson('/api/v1/public/services?available_for_active_service=1&active=1')
            ->assertOk()
            ->json('data');

        $this->assertCount(count(ServiceInterest::values()), $contact);
        $this->assertCount(9, $invoice);
        $this->assertCount(9, $activeService);

        $invoiceCodes = collect($invoice)->pluck('code');
        $this->assertFalse($invoiceCodes->contains('partnership'));
        $this->assertFalse($invoiceCodes->contains('general_business'));
    }

    public function test_dashboard_catalog_endpoint_lists_and_updates_services(): void
    {
        Permission::firstOrCreate(['name' => 'view_settings']);
        Permission::firstOrCreate(['name' => 'manage_settings']);

        $user = User::factory()->create();
        $user->givePermissionTo(['view_settings', 'manage_settings']);

        $list = $this->actingAs($user)
            ->getJson('/api/v1/service-catalog?search=Flight&per_page=10')
            ->assertOk();

        $this->assertSame('flight_arrangements', $list->json('data.0.code'));

        $service = ServiceCatalog::where('code', 'flight_arrangements')->firstOrFail();

        $this->actingAs($user)
            ->putJson("/api/v1/service-catalog/{$service->id}", [
                'code' => $service->code,
                'name_en' => $service->name_en,
                'name_ar' => $service->name_ar,
                'category' => 'travel',
                'description_en' => 'Airline ticketing and itinerary support.',
                'description_ar' => 'دعم تذاكر الطيران ومسارات السفر.',
                'show_in_contact' => true,
                'available_for_active_service' => true,
                'available_for_invoice' => true,
                'active' => true,
                'sort_order' => $service->sort_order,
            ])
            ->assertOk()
            ->assertJsonPath('data.description_en', 'Airline ticketing and itinerary support.');

        $this->assertDatabaseHas('service_catalogs', [
            'code' => 'flight_arrangements',
            'description_en' => 'Airline ticketing and itinerary support.',
        ]);
    }
}
