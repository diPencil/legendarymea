<?php

namespace App\Models;

use App\Enums\InvoiceCustomerType;
use App\Enums\InvoiceStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Invoice extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'reference',
        'customer_type',
        'company_id',
        'customer_user_id',
        'sold_by_employee_id',
        'contract_id',
        'active_service_id',
        'status',
        'issue_date',
        'due_date',
        'currency',
        'billing_name',
        'billing_email',
        'billing_phone',
        'billing_address',
        'sales_employee_name_snapshot',
        'subtotal',
        'discount_amount',
        'tax_amount',
        'total_amount',
        'supplier_total_cost',
        'gross_profit',
        'gross_margin',
        'notes',
        'internal_notes',
        'terms',
        'created_by',
    ];

    protected $casts = [
        'customer_type' => InvoiceCustomerType::class,
        'status' => InvoiceStatus::class,
        'issue_date' => 'date',
        'due_date' => 'date',
        'subtotal' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'supplier_total_cost' => 'decimal:2',
        'gross_profit' => 'decimal:2',
        'gross_margin' => 'decimal:4',
    ];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function customerUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'customer_user_id');
    }

    public function soldByEmployee(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'sold_by_employee_id');
    }

    public function contract(): BelongsTo
    {
        return $this->belongsTo(Contract::class);
    }

    public function activeService(): BelongsTo
    {
        return $this->belongsTo(ActiveService::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function items(): HasMany
    {
        return $this->hasMany(InvoiceItem::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function postedPaymentsTotal(): string
    {
        $amount = (float) $this->payments()
            ->where('status', 'posted')
            ->sum('amount');

        return number_format($amount, 2, '.', '');
    }

    public function balanceDue(): string
    {
        $balance = max(0, ((float) $this->total_amount) - ((float) $this->postedPaymentsTotal()));

        return number_format($balance, 2, '.', '');
    }
}
