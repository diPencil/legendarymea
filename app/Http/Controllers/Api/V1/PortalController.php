<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\UserStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\ActiveServiceResource;
use App\Http\Resources\ContractResource;
use App\Http\Resources\DocumentResource;
use App\Http\Resources\InvoiceResource;
use App\Http\Resources\PaymentResource;
use App\Http\Resources\QuotationResource;
use App\Http\Resources\RequestResource;
use App\Models\ActiveService;
use App\Models\Contract;
use App\Models\Document;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Quotation;
use App\Models\Request as BusinessRequest;
use App\Services\ContractPdfGenerator;
use App\Services\SystemActivityService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class PortalController extends Controller
{
    public function overview(Request $request)
    {
        $companyId = $this->companyId($request);

        return response()->json(['data' => [
            'company' => $request->user()->company()->first(),
            'totals' => [
                'contracts' => Contract::where('company_id', $companyId)->count(),
                'quotations' => Quotation::where('company_id', $companyId)->count(),
                'invoices' => Invoice::where('company_id', $companyId)->count(),
                'services' => ActiveService::where('company_id', $companyId)->count(),
                'requests' => BusinessRequest::where('company_id', $companyId)->count(),
                'documents' => Document::where('company_id', $companyId)->count(),
            ],
            'must_change_password' => (bool) $request->user()->must_change_password,
        ]]);
    }

    public function company(Request $request)
    {
        return response()->json(['data' => $request->user()->company()->firstOrFail()]);
    }

    public function contracts(Request $request)
    {
        return response()->json(['data' => Contract::where('company_id', $this->companyId($request))->latest()->paginate(15)]);
    }

    public function contract(Request $request, Contract $contract)
    {
        abort_unless((int) $contract->company_id === $this->companyId($request), 404);

        $contract->load(['company', 'contact', 'quotation', 'creator']);

        return new ContractResource($contract);
    }

    public function downloadContractPdf(Request $request, Contract $contract, ContractPdfGenerator $generator)
    {
        abort_unless((int)$contract->company_id === $this->companyId($request), 404);

        $pdf = $generator->generate($contract->load(['company', 'contact', 'quotation', 'creator']));

        SystemActivityService::record(
            actor: $request->user(),
            action: 'portal_contract_pdf_downloaded',
            module: 'Contract',
            entity: $contract,
            oldValues: null,
            newValues: ['filename' => $pdf->filename],
            metadata: ['portal' => true]
        );

        return response($pdf->contents, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="' . addslashes($pdf->filename) . '"',
            'Content-Length' => (string) strlen($pdf->contents),
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    public function updateContractSignature(Request $request, Contract $contract)
    {
        abort_unless((int) $contract->company_id === $this->companyId($request), 404);

        $validated = $request->validate([
            'first_party_name_en' => ['nullable', 'string', 'max:255'],
            'first_party_name_ar' => ['nullable', 'string', 'max:255'],
            'first_party_date' => ['nullable', 'date'],
            'second_party_name_en' => ['nullable', 'string', 'max:255'],
            'second_party_name_ar' => ['nullable', 'string', 'max:255'],
            'second_party_date' => ['nullable', 'date'],
        ]);

        if (empty($validated['first_party_name_en']) && empty($validated['first_party_name_ar']) && empty($validated['second_party_name_en']) && empty($validated['second_party_name_ar'])) {
            throw ValidationException::withMessages([
                'second_party_name_en' => [__('Please provide at least one party name (EN or AR).')],
                'second_party_name_ar' => [__('Please provide at least one party name (EN or AR).')],
            ]);
        }

        $old = $contract->only(['first_party_name_en','first_party_name_ar','first_party_date','second_party_name_en','second_party_name_ar','second_party_date']);

        $contract->fill($validated);
        $contract->save();

        $companyName = $contract->company->name ?? $request->user()->name;

        $auditLog = SystemActivityService::record(
            actor: $request->user(),
            action: 'portal_contract_signed',
            module: 'Contract',
            entity: $contract,
            oldValues: $old,
            newValues: $validated,
            titleEn: "{$companyName} signed contract {$contract->reference}",
            titleAr: "وقعت {$companyName} العقد {$contract->reference}",
            metadata: ['portal' => true, 'company_id' => $contract->company_id]
        );

        // Notify internal admins so the signature appears in their notifications
        // and opens the same contract on click (dashboard path for non-client users).
        if ($auditLog) {
            try {
                $admins = \App\Models\User::role(['super_admin', 'admin'])
                    ->where('id', '!=', $request->user()->id)
                    ->get();
                foreach ($admins as $admin) {
                    $admin->notify(new \App\Notifications\SystemNotification($auditLog));
                }
            } catch (\Throwable) {
                // Non-blocking: signature is already saved.
            }
        }

        return new ContractResource($contract->load(['company', 'contact', 'quotation', 'creator']));
    }

    public function quotations(Request $request)
    {
        return response()->json(['data' => Quotation::where('company_id', $this->companyId($request))->latest()->paginate(15)]);
    }

    public function quotation(Request $request, Quotation $quotation)
    {
        abort_unless((int) $quotation->company_id === $this->companyId($request), 404);
        $quotation->load(['company', 'contact', 'opportunity', 'request', 'items', 'creator']);
        return new QuotationResource($quotation);
    }

    public function invoices(Request $request)
    {
        return response()->json(['data' => Invoice::where('company_id', $this->companyId($request))->latest()->paginate(15)]);
    }

    public function payments(Request $request)
    {
        $companyId = $this->companyId($request);

        $payments = \App\Models\Payment::with(['invoice', 'company'])
            ->where('company_id', $companyId)
            ->where('status', \App\Enums\PaymentStatus::POSTED)
            ->latest()
            ->paginate(15);

        return response()->json(['data' => $payments]);
    }

    public function payment(Request $request, Payment $payment)
    {
        $companyId = $this->companyId($request);
        abort_unless((int) $payment->company_id === $companyId, 404);

        $payment->load(['invoice', 'company', 'customerUser']);

        return new PaymentResource($payment);
    }

    public function invoice(Request $request, Invoice $invoice)
    {
        abort_unless((int) $invoice->company_id === $this->companyId($request), 404);
        $invoice->load(['company', 'customerUser', 'contract', 'activeService', 'items', 'creator', 'soldByEmployee']);
        return new InvoiceResource($invoice);
    }

    public function services(Request $request)
    {
        return response()->json(['data' => ActiveService::where('company_id', $this->companyId($request))->latest()->paginate(15)]);
    }

    public function service(Request $request, ActiveService $activeService)
    {
        abort_unless((int) $activeService->company_id === $this->companyId($request), 404);
        $activeService->load(['company', 'contract', 'serviceCatalog', 'clientOnboarding', 'assignee', 'creator']);
        return new ActiveServiceResource($activeService);
    }

    public function requests(Request $request)
    {
        return response()->json(['data' => BusinessRequest::where('company_id', $this->companyId($request))->latest()->paginate(15)]);
    }

    public function businessRequest(Request $request, BusinessRequest $businessRequest)
    {
        abort_unless((int) $businessRequest->company_id === $this->companyId($request), 404);
        $businessRequest->load(['company', 'contact', 'assignee', 'creator']);
        return new RequestResource($businessRequest);
    }

    public function documents(Request $request)
    {
        return response()->json(['data' => Document::where('company_id', $this->companyId($request))->latest()->paginate(15)]);
    }

    public function document(Request $request, Document $document)
    {
        abort_unless((int) $document->company_id === $this->companyId($request), 404);
        $document->load(['company', 'creator']);
        return new DocumentResource($document);
    }

    public function downloadDocument(Request $request, Document $document)
    {
        abort_unless((int) $document->company_id === $this->companyId($request), 404);
        if (!$document->file_path || !Storage::disk($document->disk ?? 'private')->exists($document->file_path)) {
            abort(404, 'File not found.');
        }
        return Storage::disk($document->disk ?? 'private')->download($document->file_path, $document->original_name ?? $document->file_name ?? 'document');
    }

    public function notifications(Request $request)
    {
        $paginator = $request->user()->notifications()->latest()->paginate(15);
        $cookieLocale = $request->cookie('legendary-locale');
        $headerLocale = $request->header('Accept-Language') ?? $request->header('X-Locale') ?? '';
        $isAr = $cookieLocale === 'ar' || str_starts_with($headerLocale, 'ar') || $request->query('locale') === 'ar';

        $actionStatus = [
            'created' => ['en' => 'Created', 'ar' => 'تم الإنشاء'],
            'updated' => ['en' => 'Updated', 'ar' => 'تم التحديث'],
            'deleted' => ['en' => 'Deleted', 'ar' => 'تم الحذف'],
            'approved' => ['en' => 'Approved', 'ar' => 'تمت الموافقة'],
            'rejected' => ['en' => 'Rejected', 'ar' => 'تم الرفض'],
            'cancelled' => ['en' => 'Cancelled', 'ar' => 'تم الإلغاء'],
            'assigned' => ['en' => 'Assigned', 'ar' => 'تم التعيين'],
            'uploaded' => ['en' => 'Uploaded', 'ar' => 'تم الرفع'],
            'sent' => ['en' => 'Sent', 'ar' => 'تم الإرسال'],
            'issued' => ['en' => 'Issued', 'ar' => 'تم الإصدار'],
            'activated' => ['en' => 'Activated', 'ar' => 'تم التفعيل'],
            'expired' => ['en' => 'Expired', 'ar' => 'منتهي'],
            'terminated' => ['en' => 'Terminated', 'ar' => 'منهى'],
        ];
        $actionAr = [
            'created' => 'بإنشاء', 'updated' => 'بتحديث', 'deleted' => 'بحذف',
            'approved' => 'بالموافقة على', 'rejected' => 'برفض', 'cancelled' => 'بإلغاء',
            'assigned' => 'بتعيين', 'uploaded' => 'برفع', 'sent' => 'بإرسال',
            'issued' => 'بإصدار', 'activated' => 'بتفعيل', 'expired' => 'بإنهاء',
            'terminated' => 'بإنهاء',
        ];
        $moduleAr = [
            'company' => 'الشركة', 'contract' => 'العقد', 'invoice' => 'الفاتورة',
            'quotation' => 'عرض السعر', 'contact' => 'جهة الاتصال', 'lead' => 'العميل المحتمل',
            'opportunity' => 'الفرصة', 'task' => 'المهمة', 'request' => 'الطلب',
            'user' => 'المستخدم', 'document' => 'المستند', 'service' => 'الخدمة',
            'active_service' => 'الخدمة', 'payment' => 'الدفعة',
        ];

        $paginator->getCollection()->transform(function ($notification) use ($isAr, $actionStatus, $actionAr, $moduleAr) {
            $data = $notification->data ?? [];
            $module = (string) ($data['module'] ?? 'System');
            $actionType = strtolower((string) ($data['action_type'] ?? ''));
            $entityRef = (string) ($data['entity_reference'] ?? '');
            $actorRaw = trim((string) ($data['actor_name'] ?? ''));
            $actor = ($actorRaw !== '' && strtolower($actorRaw) !== 'system') ? $actorRaw : ($isAr ? 'ليجندري' : 'Legendary');

            // Always build portal-friendly title so admin name (Legendary) appears
            $moduleLabelAr = $moduleAr[strtolower($module)] ?? $module;
            $actionLabelAr = $actionAr[$actionType] ?? $actionType;
            if ($isAr) {
                $title = "قام {$actor} {$actionLabelAr} {$moduleLabelAr}" . ($entityRef ? " {$entityRef}" : "");
            } else {
                $title = "{$actor} {$actionType} {$module}" . ($entityRef ? " {$entityRef}" : "");
            }

            $status = $actionStatus[$actionType][$isAr ? 'ar' : 'en'] ?? ($data['action_type'] ?? $data['module'] ?? '—');
            // Fallback for notifications stored before subject_id was added: resolve via audit log
            $entityId = $data['subject_id'] ?? null;
            if (!$entityId && !empty($data['audit_log_id'])) {
                try {
                    $log = \App\Models\AuditLog::find($data['audit_log_id']);
                    if ($log) $entityId = $log->subject_id;
                } catch (\Throwable) {}
            }
            return [
                'id' => $notification->id,
                'entity_id' => $entityId,
                'reference' => $entityRef !== '' ? $entityRef : ($data['module'] ?? '—'),
                'title' => $title,
                'status' => $status,
                'created_at' => $notification->created_at?->toIso8601String(),
                'read_at' => $notification->read_at?->toIso8601String(),
                'action_path' => $data['action_path'] ?? '/portal',
                'module' => $data['module'] ?? null,
                'icon' => $data['icon'] ?? 'Bell',
            ];
        });

        return response()->json(['data' => $paginator]);
    }

    public function changePassword(Request $request)
    {
        $validated = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'string', 'min:10', 'confirmed'],
        ]);

        $user = $request->user();

        if (!Hash::check($validated['current_password'], $user->password)) {
            throw ValidationException::withMessages(['current_password' => ['Current password is incorrect.']]);
        }

        $user->forceFill([
            'password' => Hash::make($validated['password']),
            'must_change_password' => false,
            'status' => UserStatus::ACTIVE->value,
        ])->save();

        SystemActivityService::record(
            actor: $user,
            action: 'portal_password_changed',
            module: 'User',
            entity: $user,
            oldValues: [],
            newValues: [],
            metadata: []
        );

        return response()->json(['data' => ['must_change_password' => false], 'message' => 'Password changed successfully.']);
    }

    private function companyId(Request $request): int
    {
        $user = $request->user();

        abort_unless($user && $user->hasRole('client') && $user->company_id && !$user->portal_disabled_at, 403);

        return (int) $user->company_id;
    }
}
