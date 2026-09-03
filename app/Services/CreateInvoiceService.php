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
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CreateInvoiceService
{
    public function __construct(
        private ReferenceGeneratorService $referenceGenerator,
        private InvoiceFinanceCalculator $calculator,
    ) {}

    public function execute(array $data, int $creatorId): Invoice
    {
        $companyId = $this->validateCustomer($data);
        $this->validateRelationships($companyId, $data['contract_id'] ?? null, $data['active_service_id'] ?? null);
        if (!empty($data['sold_by_employee_id'])) {
            $this->validateSalesEmployee((int) $data['sold_by_employee_id']);
        }
        $this->validateSuppliers($data['items']);

        return DB::transaction(function () use ($data, $creatorId) {
            $discountFloat = (float) ($data['discount_amount'] ?? 0);
            $taxFloat = (float) ($data['tax_amount'] ?? 0);
            $currency = strtoupper($data['currency']);
            $lineCalculation = $this->calculator->calculateItems($data['items'], $currency);
            $totals = $this->calculator->calculateInvoiceTotals(
                $lineCalculation['subtotal'],
                $lineCalculation['supplier_total_cost'],
                $discountFloat,
                $taxFloat
            );

            if ((float) $totals['total_amount'] < 0) {
                throw ValidationException::withMessages([
                    'discount_amount' => ['Total amount cannot be negative.'],
                ]);
            }

            $invoice = Invoice::create([
                'reference' => $this->referenceGenerator->generate(
                    'LM-INV-' . date('Y') . '-',
                    'invoices',
                    'reference',
                    6
                ),
                'customer_type' => $data['customer_type'],
                'company_id' => $data['customer_type'] === 'company' ? $data['company_id'] : null,
                'customer_user_id' => $data['customer_type'] === 'user' ? $data['customer_user_id'] : null,
                'sold_by_employee_id' => $data['sold_by_employee_id'] ?? null,
                'contract_id' => $data['contract_id'] ?? null,
                'active_service_id' => $data['active_service_id'] ?? null,
                'status' => InvoiceStatus::DRAFT,
                'issue_date' => $data['issue_date'] ?? null,
                'due_date' => $data['due_date'] ?? null,
                'currency' => $currency,
                'subtotal' => $totals['subtotal'],
                'discount_amount' => $totals['discount_amount'],
                'tax_amount' => $totals['tax_amount'],
                'total_amount' => $totals['total_amount'],
                'supplier_total_cost' => $totals['supplier_total_cost'],
                'gross_profit' => $totals['gross_profit'],
                'gross_margin' => $totals['gross_margin'],
                'notes' => $data['notes'] ?? null,
                'internal_notes' => $data['internal_notes'] ?? null,
                'terms' => $data['terms'] ?? null,
                'created_by' => $creatorId,
            ]);

            foreach ($lineCalculation['items'] as $itemData) {
                unset($itemData['currency']);
                $invoice->items()->create($itemData);
            }

            AuditLog::create([
                'user_id' => $creatorId,
                'action' => 'invoice.created',
                'subject_type' => Invoice::class,
                'subject_id' => $invoice->id,
                'new_values' => ['reference' => $invoice->reference, 'status' => $invoice->status->value],
                'request_context' => ['ip' => request()->ip(), 'user_agent' => request()->userAgent()],
            ]);

            CrmActivity::create([
                'actor_id' => $creatorId,
                'type' => 'invoice.created',
                'subject_type' => Invoice::class,
                'subject_id' => $invoice->id,
                'company_id' => $invoice->company_id,
                'metadata' => [
                    'invoice_reference' => $invoice->reference,
                    'status' => $invoice->status->value,
                    'total_amount' => $invoice->total_amount,
                    'currency' => $invoice->currency,
                ],
            ]);

            return $invoice->load(['company', 'customerUser', 'soldByEmployee.user', 'contract', 'activeService', 'creator', 'items.supplier', 'items.serviceCatalog']);
        });
    }

    private function validateCustomer(array $data): int
    {
        if ($data['customer_type'] === 'company') {
            if (empty($data['company_id']) || !empty($data['customer_user_id'])) {
                throw ValidationException::withMessages([
                    'company_id' => ['Company invoices require exactly one company customer.'],
                ]);
            }

            return (int) $data['company_id'];
        }

        if (empty($data['customer_user_id']) || !empty($data['company_id'])) {
            throw ValidationException::withMessages([
                'customer_user_id' => ['User invoices require exactly one user customer.'],
            ]);
        }

        $customerUser = User::findOrFail($data['customer_user_id']);
        if (!$customerUser->hasRole('client')) {
            throw ValidationException::withMessages([
                'customer_user_id' => ['The selected user is not an eligible client customer.'],
            ]);
        }

        if (!empty($data['contract_id']) || !empty($data['active_service_id'])) {
            throw ValidationException::withMessages([
                'customer_user_id' => ['User invoices cannot use company contracts or active services.'],
            ]);
        }

        return 0;
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
