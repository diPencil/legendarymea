<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Company;
use App\Models\Contact;
use App\Models\Quotation;
use App\Models\QuotationItem;
use App\Models\ServiceCatalog;
use App\Models\User;
use Carbon\Carbon;

class DevQuotationSeeder extends Seeder
{
    public function run()
    {
        // 1. Get a company (create if not exists)
        $company = Company::firstOrCreate(
            ['name' => 'Acme Corporation'],
            [
                'website' => 'https://acme.example.com',
                'industry' => 'Technology',
                'description' => 'A technology company for testing.',
                'city' => 'Dubai',
                'country' => 'AE',
                'is_active' => true,
                'creator_id' => User::first()->id ?? 1
            ]
        );

        $contact = Contact::firstOrCreate(
            ['email' => 'john.doe@acme.example.com'],
            [
                'company_id' => $company->id,
                'first_name' => 'John',
                'last_name' => 'Doe',
                'job_title' => 'Procurement Manager',
                'is_primary' => true,
                'creator_id' => User::first()->id ?? 1
            ]
        );

        $catalogItems = ServiceCatalog::where('is_active', true)->take(2)->get();

        if ($catalogItems->isEmpty()) {
            $this->command->warn('No active Service Catalog items found. Run ServiceCatalogSeeder first.');
            return;
        }

        $quotation = Quotation::create([
            'reference' => 'QT-' . date('Ymd') . '-999',
            'company_id' => $company->id,
            'contact_id' => $contact->id,
            'created_by' => User::first()->id ?? 1,
            'status' => \App\Enums\QuotationStatus::DRAFT,
            'issue_date' => Carbon::now(),
            'valid_until' => Carbon::now()->addDays(30),
            'currency' => 'AED',
            'subtotal' => 0,
            'discount_amount' => 0,
            'tax_amount' => 0,
            'total_amount' => 0,
            'notes' => 'This is a development quotation created automatically.',
        ]);

        $subtotal = 0;
        $taxAmount = 0;

        foreach ($catalogItems as $catalogItem) {
            $qty = 2;
            $unitPrice = $catalogItem->base_price > 0 ? $catalogItem->base_price : 1500;
            $taxRate = $catalogItem->default_tax_rate ?? 5.00;
            
            $sub = $qty * $unitPrice;
            $tax = $sub * ($taxRate / 100);

            QuotationItem::create([
                'quotation_id' => $quotation->id,
                'service_catalog_id' => $catalogItem->id,
                'title' => $catalogItem->name,
                'description' => $catalogItem->description ?? 'Provided service description.',
                'quantity' => $qty,
                'unit_price' => $unitPrice,
                'tax_rate' => $taxRate,
                'subtotal' => $sub,
                'tax_amount' => $tax,
                'total_amount' => $sub + $tax,
                'currency' => 'AED'
            ]);

            $subtotal += $sub;
            $taxAmount += $tax;
        }

        $quotation->update([
            'subtotal' => $subtotal,
            'tax_amount' => $taxAmount,
            'total_amount' => $subtotal + $taxAmount
        ]);

        $this->command->info('Dev Quotation created successfully: ' . $quotation->reference);
    }
}
