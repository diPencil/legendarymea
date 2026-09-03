<?php

namespace Tests\Feature\Emails;

use App\Enums\EmailStatus;
use App\Models\EmailMessage;
use App\Models\EmailTemplate;
use App\Models\Inquiry;
use App\Models\MediaFile;
use App\Models\User;
use App\Services\EmailConfigurationService;
use Database\Seeders\EmailTemplateSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class EmailApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    public function test_requires_authorization_to_view_and_manage_emails(): void
    {
        $this->getJson('/api/v1/emails')->assertUnauthorized();

        $user = User::factory()->create();

        $this->actingAs($user)->getJson('/api/v1/emails')->assertForbidden();
    }

    public function test_can_create_draft_with_inquiry_and_relations(): void
    {
        $admin = $this->adminUser();
        $inquiry = Inquiry::factory()->create();

        $response = $this->actingAs($admin)->postJson('/api/v1/emails', [
            'subject' => 'Project kickoff',
            'body' => 'Welcome aboard',
            'to_name' => 'John Doe',
            'to_address' => 'john@example.com',
            'cc' => ['cc@example.com'],
            'bcc' => ['bcc@example.com'],
            'inquiry_id' => $inquiry->id,
        ])->assertCreated();

        $response
            ->assertJsonPath('data.status', EmailStatus::DRAFT->value)
            ->assertJsonPath('data.inquiry.id', $inquiry->id)
            ->assertJsonMissingPath('data.password');

        $this->assertDatabaseHas('email_messages', [
            'subject' => 'Project kickoff',
            'to_address' => 'john@example.com',
            'created_by' => $admin->id,
            'inquiry_id' => $inquiry->id,
            'status' => EmailStatus::DRAFT->value,
        ]);

        $this->assertMatchesRegularExpression('/^LM-EML-\d{4}-\d{6}$/', $response->json('data.reference'));
    }

    public function test_only_draft_emails_can_be_edited_or_cancelled(): void
    {
        $admin = $this->adminUser();
        $draft = $this->draftEmail($admin);

        $this->actingAs($admin)->putJson("/api/v1/emails/{$draft->id}", [
            'subject' => 'Updated draft',
            'body' => 'Edited body',
            'to_address' => 'updated@example.com',
            'to_name' => 'Updated Name',
            'cc' => [],
            'bcc' => [],
        ])->assertOk();

        $draft->refresh();
        $draft->update(['status' => EmailStatus::SENT]);

        $this->actingAs($admin)->putJson("/api/v1/emails/{$draft->id}", [
            'subject' => 'Should fail',
            'body' => 'Body',
            'to_address' => 'blocked@example.com',
        ])->assertForbidden();

        $this->actingAs($admin)
            ->postJson("/api/v1/emails/{$draft->id}/cancel")
            ->assertForbidden();
    }

    public function test_send_marks_email_sent_and_failure_marks_email_failed(): void
    {
        $admin = $this->adminUser();
        $success = $this->draftEmail($admin, ['subject' => 'Success']);
        $failure = $this->draftEmail($admin, ['subject' => 'Failure']);
        $this->configureEmail();

        $this->app->instance(EmailConfigurationService::class, new class extends EmailConfigurationService {
            public function sendEmailMessage(EmailMessage $email): void
            {
                if ($email->subject === 'Failure') {
                    throw new \RuntimeException('SMTP unavailable password=secret');
                }
            }
        });

        $this->actingAs($admin)->postJson("/api/v1/emails/{$success->id}/send")->assertOk();

        $this->assertDatabaseHas('email_messages', [
            'id' => $success->id,
            'status' => EmailStatus::SENT->value,
        ]);

        $this->actingAs($admin)
            ->postJson("/api/v1/emails/{$failure->id}/send")
            ->assertStatus(422)
            ->assertJsonPath('message', 'Email sending failed.');

        $this->assertDatabaseHas('email_messages', [
            'id' => $failure->id,
            'status' => EmailStatus::FAILED->value,
            'failure_message' => 'SMTP unavailable password [hidden]',
        ]);
    }

    public function test_failed_email_can_retry_and_sent_email_cannot_retry(): void
    {
        $admin = $this->adminUser();
        $failed = $this->draftEmail($admin);
        $failed->update([
            'status' => EmailStatus::FAILED,
            'failure_message' => 'SMTP unavailable',
        ]);
        $this->configureEmail();

        $this->app->instance(EmailConfigurationService::class, new class extends EmailConfigurationService {
            public function sendEmailMessage(EmailMessage $email): void {}
        });

        $this->actingAs($admin)->postJson("/api/v1/emails/{$failed->id}/retry")->assertOk();

        $this->assertDatabaseHas('email_messages', [
            'id' => $failed->id,
            'status' => EmailStatus::SENT->value,
            'failure_message' => null,
        ]);

        $sent = $this->draftEmail($admin);
        $sent->update(['status' => EmailStatus::SENT, 'sent_at' => now()]);

        $this->actingAs($admin)
            ->postJson("/api/v1/emails/{$sent->id}/retry")
            ->assertStatus(422)
            ->assertJsonPath('message', 'Only failed emails can be retried.');
    }

    public function test_template_management_requires_bilingual_content_and_persists_state(): void
    {
        $admin = $this->adminUser();

        $this->actingAs($admin)->postJson('/api/v1/email-templates', [
            'name' => 'Welcome',
            'subject_en' => 'Hello',
            'body_en' => 'Body only in English',
        ])->assertStatus(422)->assertJsonValidationErrors(['subject_ar', 'body_ar']);

        $response = $this->actingAs($admin)->postJson('/api/v1/email-templates', [
            'name' => 'Welcome',
            'key' => 'welcome-template',
            'subject_en' => 'Welcome',
            'subject_ar' => 'مرحبا',
            'body_en' => 'English body',
            'body_ar' => 'Arabic body',
            'is_active' => false,
        ])->assertCreated();

        $templateId = $response->json('data.id');

        $this->actingAs($admin)->putJson("/api/v1/email-templates/{$templateId}", [
            'name' => 'Welcome Updated',
            'key' => 'welcome-template',
            'subject_en' => 'Welcome back',
            'subject_ar' => 'أهلا بعودتك',
            'body_en' => 'Updated English body',
            'body_ar' => 'نص عربي محدث',
            'is_active' => true,
        ])->assertOk()->assertJsonPath('data.is_active', true);

        $this->assertDatabaseHas('email_templates', [
            'id' => $templateId,
            'name' => 'Welcome Updated',
            'key' => 'welcome-template',
            'is_active' => true,
        ]);
    }

    public function test_email_template_can_be_image_only_and_rejects_non_image_media(): void
    {
        $admin = $this->adminUser();

        $image = MediaFile::query()->create([
            'reference' => 'LM-MED-2026-000001',
            'type' => 'image',
            'filename' => 'template.jpg',
            'original_filename' => 'template.jpg',
            'mime_type' => 'image/jpeg',
            'size' => 120000,
            'width' => 900,
            'height' => 1400,
            'path' => 'media/template.jpg',
            'disk' => 'public',
            'uploaded_by' => $admin->id,
        ]);

        $document = MediaFile::query()->create([
            'reference' => 'LM-MED-2026-000002',
            'type' => 'document',
            'filename' => 'template.pdf',
            'original_filename' => 'template.pdf',
            'mime_type' => 'application/pdf',
            'size' => 120000,
            'path' => 'media/template.pdf',
            'disk' => 'public',
            'uploaded_by' => $admin->id,
        ]);

        $response = $this->actingAs($admin)->postJson('/api/v1/email-templates', [
            'name' => 'Image Only',
            'key' => 'image-only',
            'subject_en' => 'Campaign',
            'subject_ar' => 'حملة',
            'body_en' => '',
            'body_ar' => '',
            'image_media_id' => $image->id,
            'is_active' => true,
        ])->assertCreated()
            ->assertJsonPath('data.image_media_id', $image->id);

        $this->assertStringContainsString('<img src=', $response->json('data.body_en'));
        $this->assertStringContainsString('/dashboard-api/api/v1/media-files/' . $image->id . '/content', $response->json('data.body_en'));
        $this->assertStringContainsString('Legendary Management MEA', $response->json('data.body_en'));
        $this->assertStringContainsString('Corporate Travel, Hospitality &amp; Business Mobility Solutions', $response->json('data.body_en'));
        $this->assertStringContainsString('حلول السفر المؤسسي والضيافة وتنقل الأعمال', $response->json('data.body_ar'));
        $this->assertDatabaseHas('email_templates', [
            'key' => 'image-only',
            'image_media_id' => $image->id,
        ]);

        $this->actingAs($admin)->postJson('/api/v1/email-templates', [
            'name' => 'Document Template',
            'key' => 'document-template',
            'subject_en' => 'Document',
            'subject_ar' => 'مستند',
            'body_en' => '',
            'body_ar' => '',
            'image_media_id' => $document->id,
            'is_active' => true,
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['image_media_id']);
    }

    public function test_email_template_image_persists_when_editing_without_replacing_it(): void
    {
        $admin = $this->adminUser();

        $image = MediaFile::query()->create([
            'reference' => 'LM-MED-2026-000003',
            'type' => 'image',
            'filename' => 'template.png',
            'original_filename' => 'template.png',
            'mime_type' => 'image/png',
            'size' => 120000,
            'width' => 900,
            'height' => 1400,
            'path' => 'media/template.png',
            'disk' => 'public',
            'uploaded_by' => $admin->id,
        ]);

        $created = $this->actingAs($admin)->postJson('/api/v1/email-templates', [
            'name' => 'Persistent Image',
            'key' => 'persistent-image',
            'subject_en' => 'Campaign',
            'subject_ar' => 'حملة',
            'body_en' => '',
            'body_ar' => '',
            'image_media_id' => $image->id,
            'is_active' => true,
        ])->assertCreated();

        $templateId = $created->json('data.id');

        $this->actingAs($admin)->putJson("/api/v1/email-templates/{$templateId}", [
            'name' => 'Persistent Image Updated',
            'key' => 'persistent-image',
            'subject_en' => 'Campaign updated',
            'subject_ar' => 'حملة محدثة',
            'body_en' => $created->json('data.body_en'),
            'body_ar' => $created->json('data.body_ar'),
            'is_active' => true,
        ])->assertOk()
            ->assertJsonPath('data.image_media_id', $image->id)
            ->assertJsonPath('data.image_url', 'http://localhost/storage/media/template.png');

        $this->actingAs($admin)
            ->getJson("/api/v1/email-templates/{$templateId}")
            ->assertOk()
            ->assertJsonPath('data.image_media_id', $image->id)
            ->assertJsonPath('data.image_url', 'http://localhost/storage/media/template.png');
    }

    public function test_outgoing_email_html_resolves_storage_images_to_safe_public_urls(): void
    {
        config(['filesystems.disks.public.url' => 'https://app.legendarymea.com/storage']);

        $service = app(EmailConfigurationService::class);
        $html = '<p>Campaign</p><img src="/storage/media/template.jpg" alt="Legendary Management MEA">';

        $prepared = $service->prepareHtmlForOutgoingMessage($html);

        $this->assertStringContainsString('src="https://app.legendarymea.com/storage/media/template.jpg"', $prepared);
        $this->assertStringNotContainsString('src="/storage/', $prepared);
        $this->assertStringNotContainsString('localhost', $prepared);
    }

    public function test_outgoing_email_html_rejects_unresolved_local_images(): void
    {
        $service = app(EmailConfigurationService::class);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Outgoing email contains a local or relative image URL.');

        $service->prepareHtmlForOutgoingMessage('<img src="http://localhost:3000/broken.jpg" alt="Broken">');
    }

    public function test_professional_b2b_default_template_is_seeded_with_email_safe_html(): void
    {
        $this->seed(EmailTemplateSeeder::class);

        $template = EmailTemplate::query()
            ->where('key', 'professional-b2b-cold-outreach-legendary')
            ->firstOrFail();

        $this->assertSame('Professional B2B Cold Outreach - Legendary', $template->name);
        $this->assertSame(
            'Streamline Your Corporate Travel & Hotel Bookings with LEGENDARY MANAGEMENT MEA',
            $template->subject_en
        );
        $this->assertSame(
            'طوّر حجوزات السفر والفنادق لشركتك مع LEGENDARY MANAGEMENT MEA',
            $template->subject_ar
        );
        $this->assertTrue($template->is_active);
        $this->assertStringContainsString('<table role="presentation"', $template->body_en);
        $this->assertStringContainsString('Why Leading Corporates Partner with Us:', $template->body_en);
        $this->assertStringContainsString('Schedule a Quick Call', $template->body_en);
        $this->assertStringContainsString('href="https://wa.me/966530363444"', $template->body_en);
        $this->assertStringContainsString('[Client Name]', $template->body_en);
        $this->assertStringContainsString('[Your Name]', $template->body_en);
        $this->assertStringContainsString('[Official Email]', $template->body_en);
        $this->assertStringContainsString('<html lang="ar" dir="rtl">', $template->body_ar);
        $this->assertStringContainsString('لماذا تختار الشركات الرائدة العمل معنا؟', $template->body_ar);
        $this->assertStringContainsString('احجز مكالمة سريعة', $template->body_ar);
        $this->assertStringContainsString('href="https://wa.me/966530363444"', $template->body_ar);
        $this->assertStringContainsString('[اسم العميل]', $template->body_ar);
        $this->assertStringContainsString('[اسمك]', $template->body_ar);
        $this->assertNotSame($template->body_en, $template->body_ar);
    }

    private function adminUser(): User
    {
        $user = User::factory()->create();
        $user->assignRole('admin');

        return $user;
    }

    private function draftEmail(User $creator, array $overrides = []): EmailMessage
    {
        $template = EmailTemplate::query()->create([
            'key' => 'default-template-' . fake()->unique()->numberBetween(1, 9999),
            'name' => 'Default template',
            'subject_en' => 'Default subject',
            'subject_ar' => 'موضوع افتراضي',
            'body_en' => 'Default body',
            'body_ar' => 'نص افتراضي',
            'subject' => 'Default subject',
            'body' => 'Default body',
        ]);

        return EmailMessage::query()->create(array_merge([
            'reference' => 'LM-EML-' . now()->format('Y') . '-' . str_pad((string) random_int(1, 999999), 6, '0', STR_PAD_LEFT),
            'subject' => 'Draft subject',
            'body' => 'Draft body',
            'to_address' => 'recipient@example.com',
            'to_name' => 'Recipient',
            'cc' => ['copy@example.com'],
            'bcc' => ['blind@example.com'],
            'status' => EmailStatus::DRAFT,
            'template_id' => $template->id,
            'created_by' => $creator->id,
        ], $overrides));
    }

    private function configureEmail(): void
    {
        app(EmailConfigurationService::class)->update([
            'from_name' => 'Legendary Management MEA',
            'from_email' => 'sales@legendarymea.com',
            'smtp_host' => 'smtp.example.com',
            'smtp_port' => 587,
            'smtp_encryption' => 'tls',
            'smtp_username' => 'sales@example.com',
            'smtp_password' => 'smtp-secret',
            'smtp_auth_enabled' => true,
            'smtp_timeout' => 30,
            'incoming_protocol' => 'imap',
            'incoming_host' => 'imap.example.com',
            'incoming_port' => 993,
            'incoming_encryption' => 'ssl',
            'incoming_username' => 'sales@example.com',
            'incoming_password' => 'incoming-secret',
            'incoming_mailbox' => 'INBOX',
        ]);
    }
}
