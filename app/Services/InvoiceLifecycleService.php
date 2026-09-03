<?php

namespace App\Services;

use App\Enums\InvoiceStatus;
use App\Models\AuditLog;
use App\Models\CrmActivity;
use App\Models\Invoice;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class InvoiceLifecycleService
{
    public function __construct(
        private SupplierLedgerService $supplierLedgerService,
    ) {}

    public function issue(Invoice $invoice, int $userId): Invoice
    {
        if ($invoice->status !== InvoiceStatus::DRAFT) {
            throw ValidationException::withMessages([
                'status' => ['Only draft invoices can be issued.'],
            ]);
        }

        if ($invoice->items()->count() === 0) {
            throw ValidationException::withMessages([
                'items' => ['Cannot issue an invoice without items.'],
            ]);
        }

        return DB::transaction(function () use ($invoice, $userId) {
            $invoice->loadMissing(['company', 'customerUser', 'soldByEmployee.user', 'items.supplier']);
            $issueDate = $invoice->issue_date
                ? $invoice->issue_date->format('Y-m-d')
                : now()->format('Y-m-d');

            if ($invoice->due_date) {
                $dueDateStr = $invoice->due_date->format('Y-m-d');
                if ($dueDateStr < $issueDate) {
                    throw ValidationException::withMessages([
                        'due_date' => ['Due date cannot be before issue date.'],
                    ]);
                }
            }

            $this->supplierLedgerService->consumeForInvoice($invoice, $userId);

            $customer = $invoice->customer_type->value === 'company'
                ? $invoice->company
                : $invoice->customerUser;

            $invoice->update([
                'status' => InvoiceStatus::ISSUED,
                'issue_date' => $issueDate,
                'billing_name' => $invoice->billing_name ?? $customer?->name,
                'billing_email' => $invoice->billing_email ?? $customer?->email,
                'billing_phone' => $invoice->billing_phone ?? $invoice->company?->phone,
                'billing_address' => $invoice->billing_address ?? $invoice->company?->city,
                'sales_employee_name_snapshot' => $invoice->sales_employee_name_snapshot ?? $invoice->soldByEmployee?->user?->name,
            ]);

            AuditLog::create([
                'user_id' => $userId,
                'action' => 'invoice.issued',
                'subject_type' => Invoice::class,
                'subject_id' => $invoice->id,
                'old_values' => ['status' => 'draft'],
                'new_values' => ['status' => 'issued', 'issue_date' => $issueDate],
                'request_context' => ['ip' => request()->ip(), 'user_agent' => request()->userAgent()],
            ]);

            CrmActivity::create([
                'actor_id' => $userId,
                'type' => 'invoice.issued',
                'subject_type' => Invoice::class,
                'subject_id' => $invoice->id,
                'company_id' => $invoice->company_id,
                'metadata' => [
                    'invoice_reference' => $invoice->reference,
                    'issue_date' => $issueDate,
                    'total_amount' => $invoice->total_amount,
                    'currency' => $invoice->currency,
                ],
            ]);

            return $invoice->fresh(['company', 'customerUser', 'soldByEmployee.user', 'contract', 'activeService', 'creator', 'items.supplier', 'payments']);
        });
    }

    public function cancel(Invoice $invoice, int $userId): Invoice
    {
        if ($invoice->status !== InvoiceStatus::DRAFT) {
            throw ValidationException::withMessages([
                'status' => ['Only draft invoices can be cancelled through this endpoint.'],
            ]);
        }

        return DB::transaction(function () use ($invoice, $userId) {
            $invoice->update([
                'status' => InvoiceStatus::CANCELLED,
            ]);

            AuditLog::create([
                'user_id' => $userId,
                'action' => 'invoice.cancelled',
                'subject_type' => Invoice::class,
                'subject_id' => $invoice->id,
                'old_values' => ['status' => 'draft'],
                'new_values' => ['status' => 'cancelled'],
                'request_context' => ['ip' => request()->ip(), 'user_agent' => request()->userAgent()],
            ]);

            CrmActivity::create([
                'actor_id' => $userId,
                'type' => 'invoice.cancelled',
                'subject_type' => Invoice::class,
                'subject_id' => $invoice->id,
                'company_id' => $invoice->company_id,
                'metadata' => [
                    'invoice_reference' => $invoice->reference,
                ],
            ]);

            return $invoice;
        });
    }

    public function markOverdue(Invoice $invoice, int $userId): Invoice
    {
        if (!in_array($invoice->status, [InvoiceStatus::ISSUED, InvoiceStatus::PARTIALLY_PAID])) {
            throw ValidationException::withMessages([
                'status' => ['Only issued or partially paid invoices can be marked overdue.'],
            ]);
        }

        if (!$invoice->due_date) {
            throw ValidationException::withMessages([
                'due_date' => ['Cannot mark overdue without a due date.'],
            ]);
        }

        if ($invoice->due_date->format('Y-m-d') >= now()->format('Y-m-d')) {
            throw ValidationException::withMessages([
                'due_date' => ['Invoice is not yet past due.'],
            ]);
        }

        return DB::transaction(function () use ($invoice, $userId) {
            $invoice->update([
                'status' => InvoiceStatus::OVERDUE,
            ]);

            AuditLog::create([
                'user_id' => $userId,
                'action' => 'invoice.overdue',
                'subject_type' => Invoice::class,
                'subject_id' => $invoice->id,
                'old_values' => ['status' => $invoice->getOriginal('status')],
                'new_values' => ['status' => 'overdue'],
                'request_context' => ['ip' => request()->ip(), 'user_agent' => request()->userAgent()],
            ]);

            CrmActivity::create([
                'actor_id' => $userId,
                'type' => 'invoice.overdue',
                'subject_type' => Invoice::class,
                'subject_id' => $invoice->id,
                'company_id' => $invoice->company_id,
                'metadata' => [
                    'invoice_reference' => $invoice->reference,
                    'due_date' => $invoice->due_date->format('Y-m-d'),
                ],
            ]);

            return $invoice;
        });
    }
}
