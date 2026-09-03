<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\EmailTemplate;
use App\Models\MediaFile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class EmailTemplateController extends Controller
{
    public function index(Request $request)
    {
        Gate::authorize('viewAny', EmailTemplate::class);

        $query = EmailTemplate::query()->with('imageMedia');

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('key', 'like', "%{$search}%")
                  ->orWhere('subject_en', 'like', "%{$search}%")
                  ->orWhere('subject_ar', 'like', "%{$search}%");
            });
        }

        if ($request->filled('is_active')) {
            $query->where('is_active', filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN));
        }

        $sort = $request->input('sort', 'created_at');
        $direction = $request->input('direction', 'desc');
        
        $allowedSorts = ['created_at', 'updated_at', 'name', 'key', 'subject_en', 'is_active'];
        if (in_array($sort, $allowedSorts)) {
            $query->orderBy($sort, $direction === 'asc' ? 'asc' : 'desc');
        }

        $perPage = (int) $request->input('per_page', 15);
        if ($perPage < 1 || $perPage > 100) $perPage = 15;

        return response()->json($query->paginate($perPage));
    }

    public function store(Request $request)
    {
        Gate::authorize('create', EmailTemplate::class);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'key' => 'nullable|string|max:255|unique:email_templates,key',
            'subject' => 'nullable|string|max:255',
            'body' => 'nullable|string',
            'subject_en' => 'nullable|string|max:255',
            'subject_ar' => 'nullable|string|max:255',
            'body_en' => 'nullable|string',
            'body_ar' => 'nullable|string',
            'image_media_id' => 'nullable|exists:media_files,id',
            'is_active' => 'boolean',
        ]);

        $validated = $this->normalizeTemplatePayload($validated);
        $template = EmailTemplate::create($validated);

        return response()->json(['data' => $template->load('imageMedia')], 201);
    }

    public function show(EmailTemplate $email_template)
    {
        Gate::authorize('view', $email_template);
        return response()->json(['data' => $email_template->load('imageMedia')]);
    }

    public function update(Request $request, EmailTemplate $email_template)
    {
        Gate::authorize('update', $email_template);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'key' => ['nullable', 'string', 'max:255', Rule::unique('email_templates', 'key')->ignore($email_template->id)],
            'subject' => 'nullable|string|max:255',
            'body' => 'nullable|string',
            'subject_en' => 'nullable|string|max:255',
            'subject_ar' => 'nullable|string|max:255',
            'body_en' => 'nullable|string',
            'body_ar' => 'nullable|string',
            'image_media_id' => 'nullable|exists:media_files,id',
            'is_active' => 'boolean',
        ]);

        $validated = $this->normalizeTemplatePayload($validated, $email_template);
        $email_template->update($validated);

        return response()->json(['data' => $email_template->load('imageMedia')]);
    }

    public function destroy(EmailTemplate $email_template)
    {
        Gate::authorize('delete', $email_template);
        $email_template->delete();
        return response()->noContent();
    }

    private function normalizeTemplatePayload(array $validated, ?EmailTemplate $template = null): array
    {
        $subjectEn = $validated['subject_en'] ?? $validated['subject'] ?? $template?->subject_en ?? $template?->subject;
        $subjectAr = $validated['subject_ar'] ?? $validated['subject'] ?? $template?->subject_ar ?? $template?->subject;
        $bodyEn = $validated['body_en'] ?? $validated['body'] ?? $template?->body_en ?? $template?->body;
        $bodyAr = $validated['body_ar'] ?? $validated['body'] ?? $template?->body_ar ?? $template?->body;
        $imageMediaId = array_key_exists('image_media_id', $validated)
            ? $validated['image_media_id']
            : $template?->image_media_id;
        $imageMedia = $imageMediaId ? MediaFile::query()->find($imageMediaId) : null;

        if ($imageMedia && $imageMedia->type !== 'image') {
            throw ValidationException::withMessages([
                'image_media_id' => ['The selected template media must be an image.'],
            ]);
        }

        if ($imageMedia) {
            $bodyEn = $this->withTemplateImage($bodyEn, $imageMedia, $subjectEn, 'en');
            $bodyAr = $this->withTemplateImage($bodyAr, $imageMedia, $subjectAr, 'ar');
        }

        if (!$subjectEn || !$subjectAr || !$bodyEn || !$bodyAr) {
            throw ValidationException::withMessages(array_filter([
                'subject_en' => !$subjectEn ? ['The subject en field is required.'] : null,
                'subject_ar' => !$subjectAr ? ['The subject ar field is required.'] : null,
                'body_en' => !$bodyEn ? ['The body en field is required.'] : null,
                'body_ar' => !$bodyAr ? ['The body ar field is required.'] : null,
            ]));
        }

        $key = $validated['key'] ?? $template?->key ?? Str::slug($validated['name']);

        if (!$template && EmailTemplate::query()->where('key', $key)->exists()) {
            $key = sprintf('%s-%d', $key, EmailTemplate::query()->count() + 1);
        }

        return [
            'name' => $validated['name'],
            'key' => $key,
            'subject' => $subjectEn,
            'body' => $bodyEn,
            'subject_en' => $subjectEn,
            'subject_ar' => $subjectAr,
            'body_en' => $bodyEn,
            'body_ar' => $bodyAr,
            'image_media_id' => $imageMediaId,
            'is_active' => (bool) ($validated['is_active'] ?? $template?->is_active ?? true),
        ];
    }

    private function withTemplateImage(?string $body, MediaFile $imageMedia, ?string $alt, string $locale): string
    {
        $proxyUrl = '/dashboard-api/api/v1/media-files/' . $imageMedia->id . '/content';
        
        $imageHtml = sprintf(
            '<img src="%s" alt="%s" style="display:block;width:auto;max-width:100%%;height:auto;margin:0 auto;border:0;outline:none;text-decoration:none;" />',
            e($proxyUrl),
            e($alt ?: $imageMedia->alt_text_en ?: $imageMedia->original_filename ?: 'Email template image')
        );

        $body = trim((string) $body);

        if ($body === '') {
            return $this->imageOnlyTemplateBody($imageHtml, $locale);
        }

        if (str_contains($body, (string) $imageMedia->url) || str_contains($body, $proxyUrl)) {
            return $body;
        }

        return $imageHtml . "\n" . $body;
    }

    private function imageOnlyTemplateBody(string $imageHtml, string $locale): string
    {
        if ($locale === 'ar') {
            return <<<HTML
<!doctype html>
<html lang="ar" dir="rtl">
  <body style="margin:0;padding:0;background:#f4f1eb;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;color:#081d60;direction:rtl;text-align:right;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#f4f1eb;margin:0;padding:0;">
      <tr>
        <td align="center" style="padding:28px 14px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width:auto;max-width:640px;background:#ffffff;border:1px solid #ded8ce;border-radius:14px;overflow:hidden;">
            <tr>
              <td style="padding:0;text-align:center;">{$imageHtml}</td>
            </tr>
            <tr>
              <td style="background:#081d60;padding:22px 32px;text-align:center;color:#ffffff;">
                <div style="font-size:15px;font-weight:700;">Legendary Management MEA</div>
                <div style="font-size:12px;line-height:1.6;color:#d8c27c;margin-top:6px;">حلول السفر المؤسسي والضيافة وتنقل الأعمال</div>
                <div style="font-size:12px;line-height:1.7;color:#dfe5f6;margin-top:10px;">info@legendarymea.com &nbsp;|&nbsp; <span dir="ltr">+966 53 314 4910</span> &nbsp;|&nbsp; legendarymea.com</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
HTML;
        }

        return <<<HTML
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f1eb;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;color:#081d60;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#f4f1eb;margin:0;padding:0;">
      <tr>
        <td align="center" style="padding:28px 14px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width:auto;max-width:640px;background:#ffffff;border:1px solid #ded8ce;border-radius:14px;overflow:hidden;">
            <tr>
              <td style="padding:0;text-align:center;">{$imageHtml}</td>
            </tr>
            <tr>
              <td style="background:#081d60;padding:22px 32px;text-align:center;color:#ffffff;">
                <div style="font-size:15px;font-weight:700;">Legendary Management MEA</div>
                <div style="font-size:12px;line-height:1.6;color:#d8c27c;margin-top:6px;">Corporate Travel, Hospitality &amp; Business Mobility Solutions</div>
                <div style="font-size:12px;line-height:1.7;color:#dfe5f6;margin-top:10px;">info@legendarymea.com &nbsp;|&nbsp; +966 53 314 4910 &nbsp;|&nbsp; legendarymea.com</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
HTML;
    }
}
