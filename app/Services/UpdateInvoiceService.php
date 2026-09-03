<?php

namespace App\Services;

use App\Enums\InvoiceStatus;
use App\Enums\SupplierStatus;
use App\Models\ActiveService;
use App\Models\AuditLog;
use App\Models\Contract;
use App\Models\CrmActivity;
use App\Models\Employee;
use App\Models\Invoice;
use App\Models\SupplierLedgerEntry;
use App\Models\Supplier;
use App\Enums\SupplierLedgerType;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class UpdateInvoiceService
{
    public function __construct(
        private InvoiceFinanceCalculator $calculator,
    ) {}

    public function execute(Invoice $invoice, array $data, int $updaterId): Invoice
    {
        if (!in_array($invoice->status, [InvoiceStatus::DRAFT, InvoiceStatus::ISSUED], true)) {
            throw ValidationException::withMessages([
                'status' => ['Only draft or issued invoices can be edited.'],
            ]);
        }

        if ($invoice->status === InvoiceStatus::ISSUED && isset($data['items']) && SupplierLedgerEntry::query()
            ->where('invoice_id', $invoice->id)
            ->where('type', SupplierLedgerType::INVOICE_USAGE)
            ->exists()) {
            throw ValidationException::withMessages([
                'items' => ['Issued invoices with supplier ledger usage cannot have their items edited.'],
            ]);
        }

        $customerType = $data['customer_type'] ?? $invoice->customer_type->value;
        $wasCompanyInvoice = $invoice->customer_type->value === 'company';

        if ($customerType === 'company') {
            $companyId = array_key_exists('company_id', $data)
                ? (int) ($data['company_id'] ?? 0)
                : ($wasCompanyInvoice ? (int) ($invoice->company_id ?? 0) : 0);
            $customerUserId = array_key_exists('customer_user_id', $data) ? (int) ($data['customer_user_id'] ?? 0) : 0;
            $contractId = array_key_exists('contract_id', $data) ? ($data['contract_id'] ? (int) $data['contract_id'] : null) : $invoice->contract_id;
            $activeServiceId = array_key_exists('active_service_id', $data) ? ($data['active_service_id'] ? (int) $data['active_service_id'] : null) : $invoice->active_service_id;
        } else {
            $companyId = array_key_exists('company_id', $data) ? (int) ($data['company_id'] ?? 0) : 0;
            $customerUserId = array_key_exists('customer_user_id', $data)
                ? (int) ($data['customer_user_id'] ?? 0)
                : ($wasCompanyInvoice ? 0 : (int) ($invoice->customer_user_id ?? 0));
            $contractId = array_key_exists('contract_id', $data) ? ($data['contract_id'] ? (int) $data['contract_id'] : null) : null;
            $activeServiceId = array_key_exists('active_service_id', $data) ? ($data['active_service_id'] ? (int) $data['active_service_id'] : null) : null;
        }

        $soldByEmployeeId = array_key_exists('sold_by_employee_id', $data) ? (int) $data['sold_by_employee_id'] : (int) $invoice->sold_by_employee_id;

        $this->validateCustomer($customerType, $companyId, $customerUserId, $contractId, $activeServiceId);
        $this->validateRelationships($companyId, $contractId, $activeServiceId);
        if (array_key_exists('sold_by_employee_id', $data) && $soldByEmployeeId > 0) {
            $this->validateSalesEmployee($soldByEmployeeId);
        }
        if (isset($data['items'])) {
            $this->validateSuppliers($data['items']);
        }

        return DB::transaction(function () use ($invoice, $data, $updaterId, $customerType, $companyId, $customerUserId, $contractId, $activeServiceId, $soldByEmployeeId) {
            $currency = strtoupper($data['currency'] ?? $invoice->currency);
            $discount = array_key_exists('discount_amount', $data) ? (float) $data['discount_amount'] : (float) $invoice->discount_amount;
            $tax = array_key_exists('tax_amount', $data) ? (float) $data['tax_amount'] : (float) $invoice->tax_amount;

            if (isset($data['items'])) {
                $invoice->items()->delete();
                $lineCalculation = $this->calculator->calculateItems($data['items'], $currency);

                foreach ($lineCalculation['items'] as $itemData) {
                    unset($itemData['currency']);
                    $invoice->items()->create($itemData);
                }
            } else {
                $lineCalculation = [
                    'subtotal' => (float) $invoice->subtotal,
                    'supplier_total_cost' => (float) $invoice->supplier_total_cost,
                ];
            }

            $totals = $this->calculator->calculateInvoiceTotals(
                $lineCalculation['subtotal'],
                $lineCalculation['supplier_total_cost'],
                $discount,
                $tax
            );

            if ((float) $totals['total_amount'] < 0) {
                throw ValidationException::withMessages([
                    'discount_amount' => ['Total amount cannot be negative.'],
                ]);
            }

            $invoice->update([
                'customer_type' => $customerType,
                'company_id' => $customerType === 'company' ? $companyId : null,
                'customer_user_id' => $customerType === 'user' ? $customerUserId : null,
                'sold_by_employee_id' => $soldByEmployeeId > 0 ? $soldByEmployeeId : null,
                'contract_id' => $contractId,
                'active_service_id' => $activeServiceId,
                'currency' => $currency,
                'subtotal' => $totals['subtotal'],
                'discount_amount' => $totals['discount_amount'],
                'tax_amount' => $totals['tax_amount'],
                'total_amount' => $totals['total_amount'],
                'supplier_total_cost' => $totals['supplier_total_cost'],
                'gross_profit' => $totals['gross_profit'],
                'gross_margin' => $totals['gross_margin'],
                'issue_date' => array_key_exists('issue_date', $data) ? $data['issue_date'] : $invoice->issue_date,
                'due_date' => array_key_exists('due_date', $data) ? $data['due_date'] : $invoice->due_date,
                'notes' => array_key_exists('notes', $data) ? $data['notes'] : $invoice->notes,
                'internal_notes' => array_key_exists('internal_notes', $data) ? $data['internal_notes'] : $invoice->internal_notes,
                'terms' => array_key_exists('terms', $data) ? $data['terms'] : $invoice->terms,
            ]);

            AuditLog::create([
                'user_id' => $updaterId,
                'action' => 'invoice.updated',
                'subject_type' => Invoice::class,
                'subject_id' => $invoice->id,
                'new_values' => ['reference' => $invoice->reference, 'total_amount' => $invoice->total_amount],
                'request_context' => ['ip' => request()->ip(), 'user_agent' => request()->userAgent()],
            ]);

            CrmActivity::create([
                'actor_id' => $updaterId,
                'type' => 'invoice.updated',
                'subject_type' => Invoice::class,
                'subject_id' => $invoice->id,
                'company_id' => $invoice->company_id,
                'metadata' => [
                    'invoice_reference' => $invoice->reference,
                    'total_amount' => $invoice->total_amount,
                    'currency' => $invoice->currency,
                ],
            ]);

            return $invoice->fresh(['company', 'customerUser', 'soldByEmployee.user', 'contract', 'activeService', 'creator', 'items.supplier', 'items.serviceCatalog']);
        });
    }

    private function validateCustomer(string $customerType, int $companyId, int $customerUserId, ?int $contractId, ?int $activeServiceId): void
    {
        if ($customerType === 'company') {
            if ($companyId <= 0 || $customerUserId > 0) {
                throw ValidationException::withMessages(['company_id' => ['Company invoices require exactly one company customer.']]);
            }

            return;
        }

        if ($customerUserId <= 0 || $companyId > 0) {
            throw ValidationException::withMessages(['customer_user_id' => ['User invoices require exactly one user customer.']]);
        }

        $user = User::findOrFail($customerUserId);
        if (!$user->hasRole('client')) {
            throw ValidationException::withMessages(['customer_user_id' => ['The selected user is not an eligible client customer.']]);
        }

        if ($contractId || $activeServiceId) {
            throw ValidationException::withMessages(['customer_user_id' => ['User invoices cannot use company contracts or active services.']]);
        }
    }

    private function validateRelationships(int $companyId, ?int $contractId, ?int $activeServiceId): void
    {
        if ($companyId <= 0) {
            return;
        }

        if ($contractId) {
            $contract = Contract::find($contractId);
            if (!$contract) {
                throw ValidationException::withMessages(['contract_id' => ['Contract not found.']]);
            }
            if ((int) $contract->company_id !== $companyId) {
                throw ValidationException::withMessages(['contract_id' => ['Contract does not belong to the selected Company.']]);
            }
        }

        if ($activeServiceId) {
            $activeService = ActiveService::find($activeServiceId);
            if (!$activeService) {
                throw ValidationException::withMessages(['active_service_id' => ['Active Service not found.']]);
            }
            if ((int) $activeService->company_id !== $companyId) {
                throw ValidationException::withMessages(['active_service_id' => ['Active Service does not belong to the selected Company.']]);
            }
            if ($contractId && (int) $activeService->contract_id !== $contractId) {
                throw ValidationException::withMessages(['active_service_id' => ['Active Service does not belong to the selected Contract.']]);
            }
        }
    }

    private function validateSalesEmployee(int $employeeId): void
    {
        $employee = Employee::findOrFail($employeeId);
        if ($employee->status !== 'active' || $employee->department !== 'Sales' || !$employee->is_sales_eligible) {
            throw ValidationException::withMessages([
                    'sold_by_employee_id' => ['The selected employee is not eligible for sales attribution.'],
                ]);
            }
        }

    private function validateSuppliers(array $items): void
    {
        $supplierIds = collect($items)->pluck('supplier_id')->filter()->unique();
        if ($supplierIds->isEmpty()) {
            return;
        }
        $suppliers = Supplier::query()->whereIn('id', $supplierIds)->get()->keyBy('id');

        foreach ($supplierIds as $supplierId) {
            $supplier = $suppliers->get($supplierId);
            if (!$supplier || $supplier->status !== SupplierStatus::ACTIVE) {
                throw ValidationException::withMessages([
                    'items' => ['Invoice items must use active suppliers.'],
                ]);
            }
        }
    }
}
