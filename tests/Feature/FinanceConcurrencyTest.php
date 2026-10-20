<?php

namespace Tests\Feature;

use App\Enums\InvoiceStatus;
use App\Enums\PaymentStatus;
use App\Models\Company;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\PaymentAllocation;
use App\Models\User;
use App\Support\Money;
use Illuminate\Support\Facades\DB;
use Symfony\Component\Process\Process;
use Tests\TestCase;

class FinanceConcurrencyTest extends TestCase
{
    /** @var array<int, int> */
    private array $companyIds = [];

    /** @var array<int, int> */
    private array $userIds = [];

    /** @var array<int, int> */
    private array $invoiceIds = [];

    protected function tearDown(): void
    {
        if ($this->companyIds !== []) {
            $paymentIds = Payment::query()->whereIn('company_id', $this->companyIds)->pluck('id');
            DB::table('payment_allocation_requests')->whereIn('payment_id', $paymentIds)->delete();
            PaymentAllocation::query()->whereIn('payment_id', $paymentIds)->delete();
            Payment::query()->whereIn('id', $paymentIds)->delete();
            DB::table('invoices')->whereIn('id', $this->invoiceIds)->delete();
            DB::table('companies')->whereIn('id', $this->companyIds)->delete();
        }

        if ($this->userIds !== []) {
            User::query()->whereIn('id', $this->userIds)->delete();
        }

        parent::tearDown();
    }

    public function test_simultaneous_duplicate_payment_submissions_are_idempotent(): void
    {
        [$user, $company] = $this->createActors();
        $invoice = $this->createInvoice($company, $user, '1000.00');
        $key = 'phase5-concurrent-payment-' . bin2hex(random_bytes(8));
        $payload = [
            'company_id' => $company->id,
            'amount' => '800.00',
            'currency' => 'AED',
            'method' => 'bank_transfer',
            'paid_at' => now()->toIso8601String(),
            'idempotency_key' => $key,
            'allocations' => [
                ['invoice_id' => $invoice->id, 'amount' => '800.00'],
            ],
        ];

        $results = $this->runConcurrently([
            ['operation' => 'create_payment', 'user_id' => $user->id, 'payload' => $payload],
            ['operation' => 'create_payment', 'user_id' => $user->id, 'payload' => $payload],
        ]);

        $this->assertSame(['ok', 'ok'], array_column($results, 'status'), json_encode($results));
        $this->assertSame($results[0]['payment_id'], $results[1]['payment_id']);
        $this->assertSame(1, Payment::query()->where('idempotency_key', $key)->count());
        $this->assertSame(1, PaymentAllocation::query()->where('payment_id', $results[0]['payment_id'])->count());
        $this->assertSame('200.00', $invoice->fresh()->balanceDue());
    }

    public function test_simultaneous_credit_consumption_cannot_overspend_source_payment(): void
    {
        [$user, $company] = $this->createActors();
        $firstInvoice = $this->createInvoice($company, $user, '800.00');
        $secondInvoice = $this->createInvoice($company, $user, '800.00');
        $payment = Payment::factory()->create([
            'company_id' => $company->id,
            'customer_type' => 'company',
            'invoice_id' => null,
            'status' => PaymentStatus::POSTED,
            'amount' => '1000.00',
            'allocated_amount' => '0.00',
            'unallocated_amount' => '1000.00',
            'currency' => 'AED',
            'paid_at' => now(),
            'recorded_by' => $user->id,
        ]);

        $results = $this->runConcurrently([
            [
                'operation' => 'apply_credit',
                'user_id' => $user->id,
                'payment_id' => $payment->id,
                'payload' => [
                    'company_id' => $company->id,
                    'idempotency_key' => 'phase5-credit-a-' . bin2hex(random_bytes(8)),
                    'allocations' => [['invoice_id' => $firstInvoice->id, 'amount' => '800.00']],
                ],
            ],
            [
                'operation' => 'apply_credit',
                'user_id' => $user->id,
                'payment_id' => $payment->id,
                'payload' => [
                    'company_id' => $company->id,
                    'idempotency_key' => 'phase5-credit-b-' . bin2hex(random_bytes(8)),
                    'allocations' => [['invoice_id' => $secondInvoice->id, 'amount' => '800.00']],
                ],
            ],
        ]);

        $statuses = array_column($results, 'status');
        sort($statuses);
        $this->assertSame(['ok', 'validation'], $statuses, json_encode($results));

        $payment->refresh();
        $activeAllocated = PaymentAllocation::query()
            ->where('payment_id', $payment->id)
            ->whereNull('reversed_at')
            ->sum('amount');

        $this->assertSame('800.000', $activeAllocated);
        $this->assertSame('800.000', $payment->allocated_amount);
        $this->assertSame('200.000', $payment->unallocated_amount);
        $this->assertSame('1000.00', Money::add($payment->allocated_amount, $payment->unallocated_amount, 'AED'));
    }

    /** @return array{User, Company} */
    private function createActors(): array
    {
        $user = User::factory()->create();
        $company = Company::factory()->create();
        $this->userIds[] = $user->id;
        $this->companyIds[] = $company->id;

        return [$user, $company];
    }

    private function createInvoice(Company $company, User $user, string $amount): Invoice
    {
        $invoice = Invoice::factory()->create([
            'company_id' => $company->id,
            'created_by' => $user->id,
            'status' => InvoiceStatus::ISSUED,
            'currency' => 'AED',
            'subtotal' => $amount,
            'discount_amount' => '0.00',
            'tax_amount' => '0.00',
            'total_amount' => $amount,
            'issue_date' => now()->subDay()->toDateString(),
            'due_date' => now()->addWeek()->toDateString(),
        ]);

        $this->invoiceIds[] = $invoice->id;

        return $invoice;
    }

    /** @return array<int, array<string, mixed>> */
    private function runConcurrently(array $jobs): array
    {
        $startAt = microtime(true) + 1.5;
        $processes = [];

        foreach ($jobs as $job) {
            $job['start_at'] = $startAt;
            $encoded = base64_encode(json_encode($job, JSON_THROW_ON_ERROR));
            $process = new Process([PHP_BINARY, base_path('tests/Support/ConcurrentFinanceWorker.php'), $encoded]);
            $process->setTimeout(30);
            $process->start();
            $processes[] = $process;
        }

        return array_map(function (Process $process): array {
            $process->wait();
            $output = trim($process->getOutput());

            $this->assertNotSame('', $output, $process->getErrorOutput());

            return json_decode($output, true, 512, JSON_THROW_ON_ERROR);
        }, $processes);
    }
}
