<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ServiceCatalogSeeder extends Seeder
{
    public function run()
    {
        $services = [
            ['code' => 'hotels_accommodation', 'name_en' => 'Hotels & Accommodation', 'name_ar' => 'الفنادق والإقامة', 'category' => 'travel', 'contact' => true, 'invoice' => true, 'active_service' => true],
            ['code' => 'flight_arrangements', 'name_en' => 'Flight Arrangements', 'name_ar' => 'ترتيبات الطيران', 'category' => 'travel', 'contact' => true, 'invoice' => true, 'active_service' => true],
            ['code' => 'transfers', 'name_en' => 'Transfers', 'name_ar' => 'الانتقالات', 'category' => 'travel', 'contact' => true, 'invoice' => true, 'active_service' => true],
            ['code' => 'car_rental', 'name_en' => 'Car Rental', 'name_ar' => 'تأجير السيارات', 'category' => 'travel', 'contact' => true, 'invoice' => true, 'active_service' => true],
            ['code' => 'tours_experiences', 'name_en' => 'Tours & Experiences', 'name_ar' => 'الجولات والتجارب', 'category' => 'travel', 'contact' => true, 'invoice' => true, 'active_service' => true],
            ['code' => 'groups_special_requests', 'name_en' => 'Groups & Special Requests', 'name_ar' => 'المجموعات والطلبات الخاصة', 'category' => 'travel', 'contact' => true, 'invoice' => true, 'active_service' => true],
            ['code' => 'corporate_travel', 'name_en' => 'Corporate Travel', 'name_ar' => 'سفر الشركات', 'category' => 'travel', 'contact' => true, 'invoice' => true, 'active_service' => true],
            ['code' => 'hospitality_solutions', 'name_en' => 'Hospitality Solutions', 'name_ar' => 'خدمات الضيافة', 'category' => 'business', 'contact' => true, 'invoice' => true, 'active_service' => true],
            ['code' => 'taxidia_b2b_platform', 'name_en' => 'Taxidia B2B Platform', 'name_ar' => 'منصة تاكسيديا للأعمال', 'category' => 'business', 'contact' => true, 'invoice' => true, 'active_service' => true],
            ['code' => 'partnership', 'name_en' => 'Strategic Partnership', 'name_ar' => 'شراكة استراتيجية', 'category' => 'business', 'contact' => true, 'invoice' => false, 'active_service' => false],
            ['code' => 'general_business', 'name_en' => 'General Business', 'name_ar' => 'أعمال عامة', 'category' => 'business', 'contact' => true, 'invoice' => false, 'active_service' => false],
        ];

        foreach ($services as $index => $s) {
            DB::table('service_catalogs')->updateOrInsert(
                ['code' => $s['code']],
                [
                    'name_en' => $s['name_en'],
                    'name_ar' => $s['name_ar'],
                    'category' => $s['category'],
                    'active' => true,
                    'show_in_contact' => $s['contact'],
                    'available_for_invoice' => $s['invoice'],
                    'available_for_active_service' => $s['active_service'],
                    'sort_order' => $index,
                ]
            );
        }
    }
}
