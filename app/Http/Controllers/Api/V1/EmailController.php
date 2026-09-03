<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\EmailStatus;
use App\Http\Controllers\Controller;
use App\Models\EmailMessage;
use App\Models\Inquiry;
use App\Services\EmailConfigurationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Throwable;

class EmailController extends Controller
{
    public function __construct(private readonly EmailConfigurationService $emailConfiguration) {}

    public function index(Request $request)
    {
        Gate::authorize('viewAny', EmailMessage::class);

        $query = EmailMessage::query()->with(['template', 'creator']);
        $query->with('inquiry');

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('subject', 'like', "%{$search}%")
                  ->orWhere('to_address', 'like', "%{$search}%")
                  ->orWhere('reference', 'like', "%{$search}%")
                  ->orWhere('to_name', 'like', "%{$search}%");
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('inquiry_id')) {
            $query->where('inquiry_id', $request->integer('inquiry_id'));
        }

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date('date_from'));
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date('date_to'));
        }

        $sort = $request->input('sort', 'created_at');
        $direction = $request->input('direction', 'desc');
        
        $allowedSorts = ['created_at', 'updated_at', 'subject', 'to_address', 'status', 'sent_at', 'reference'];
        if (in_array($sort, $allowedSorts)) {
            $query->orderBy($sort, $direction === 'asc' ? 'asc' : 'desc');
        }

        $perPage = (int) $request->input('per_page', 15);
        if ($perPage < 1 || $perPage > 100) $perPage = 15;

        return response()->json($query->paginate($perPage));
    }

    public function store(Request $request)
    {
        Gate::authorize('create', EmailMessage::class);

        $validated = $request->validate([
            'subject' => 'required|string|max:255',
            'body' => 'required|string',
            'to_address' => 'required|email|max:255',
            'to_name' => 'nullable|string|max:255',
            'cc' => 'nullable|array',
            'cc.*' => 'email|max:255',
            'bcc' => 'nullable|array',
            'bcc.*' => 'email|max:255',
            'template_id' => 'nullable|exists:email_templates,id',
            'inquiry_id' => 'nullable|exists:inquiries,id',
        ]);

        $validated['status'] = EmailStatus::DRAFT;
        $validated['created_by'] = $request->user()->id;
        $validated['reference'] = $this->generateReference();

        $email = EmailMessage::create($validated);

        return response()->json(['data' => $email->load(['template', 'creator', 'inquiry'])], 201);
    }

    public function show(EmailMessage $email)
    {
        Gate::authorize('view', $email);
        $email->load(['template', 'creator', 'inquiry']);
        return response()->json(['data' => $email]);
    }

    public function update(Request $request, EmailMessage $email)
    {
        Gate::authorize('update', $email);

        if ($email->status !== EmailStatus::DRAFT) {
            return response()->json(['message' => 'Only draft emails can be edited.'], 422);
        }

        $validated = $request->validate([
            'subject' => 'required|string|max:255',
            'body' => 'required|string',
            'to_address' => 'required|email|max:255',
            'to_name' => 'nullable|string|max:255',
            'cc' => 'nullable|array',
            'cc.*' => 'email|max:255',
            'bcc' => 'nullable|array',
            'bcc.*' => 'email|max:255',
            'template_id' => 'nullable|exists:email_templates,id',
            'inquiry_id' => 'nullable|exists:inquiries,id',
        ]);

        $validated['failure_message'] = null;
        $email->update($validated);

        return response()->json(['data' => $email->load(['template', 'creator', 'inquiry'])]);
    }

    public function destroy(EmailMessage $email)
    {
        Gate::authorize('delete', $email);
        $email->delete();
        return response()->noContent();
    }

    public function send(Request $request, EmailMessage $email)
    {
        Gate::authorize('send', $email);

        if (!in_array($email->status, [EmailStatus::DRAFT, EmailStatus::FAILED], true)) {
            return response()->json(['message' => 'Only draft or failed emails can be sent.'], 422);
        }

        try {
            $this->emailConfiguration->sendEmailMessage($email);

            $email->update([
                'status' => EmailStatus::SENT,
                'sent_at' => now(),
                'failure_message' => null,
            ]);
        } catch (Throwable $exception) {
            $email->update([
                'status' => EmailStatus::FAILED,
                'failure_message' => $this->emailConfiguration->safeError($exception->getMessage()),
            ]);

            return response()->json([
                'message' => 'Email sending failed.',
                'data' => $email->load(['template', 'creator', 'inquiry']),
            ], 422);
        }

        return response()->json(['data' => $email->load(['template', 'creator', 'inquiry'])]);
    }

    public function cancel(Request $request, EmailMessage $email)
    {
        Gate::authorize('update', $email);

        if ($email->status !== EmailStatus::DRAFT) {
            return response()->json(['message' => 'Only draft emails can be cancelled.'], 422);
        }

        $email->update([
            'status' => EmailStatus::CANCELLED,
        ]);

        return response()->json(['data' => $email->load(['template', 'creator', 'inquiry'])]);
    }

    public function retry(Request $request, EmailMessage $email)
    {
        Gate::authorize('send', $email);

        if ($email->status !== EmailStatus::FAILED) {
            return response()->json(['message' => 'Only failed emails can be retried.'], 422);
        }

        return $this->send($request, $email);
    }

    private function generateReference(): string
    {
        do {
            $reference = 'LM-EML-'.now()->format('Y').'-'.str_pad((string) random_int(1, 999999), 6, '0', STR_PAD_LEFT);
        } while (EmailMessage::query()->where('reference', $reference)->exists());

        return $reference;
    }
}
