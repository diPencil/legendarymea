<?php

namespace Tests\Feature;

use App\Models\Inquiry;
use App\Enums\InquiryStatus;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;

class PublicInquiryApiTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    public function test_can_submit_public_inquiry()
    {
        $payload = [
            'name' => 'John Doe',
            'email' => 'john@example.com',
            'phone' => '1234567890',
            'company' => 'Acme Corp',
            'subject' => 'Business Inquiry',
            'message' => 'I would like to discuss a partnership.',
        ];

        $res = $this->postJson('/api/v1/public/inquiries', $payload)->assertCreated();
        
        $this->assertDatabaseHas('inquiries', [
            'email' => 'john@example.com',
            'status' => InquiryStatus::NEW->value,
            'assigned_to' => null,
            'internal_notes' => null,
            'resolved_at' => null,
        ]);
        
        $inquiry = Inquiry::where('email', 'john@example.com')->first();
        $this->assertStringContainsString('Acme Corp', $inquiry->message);
        $this->assertStringContainsString('discuss a partnership', $inquiry->message);
    }
}
