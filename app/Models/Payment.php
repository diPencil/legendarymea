<?php

namespace App\Models;

use App\Enums\InvoiceCustomerType;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Payment extends Model
{
    use HasFactory;

    protected $fillable = [
        'reference',
        'idempotency_key',
        'invoice_id',
        'customer_type',
        'company_id',
        'customer_user_id',
        'status',
        'amount',
        'allocated_amount',
        'unallocated_amount',
        'currency',
        'method',
        'transaction_reference',
        'paid_at',
        'notes',
        'recorded_by',
        'reversed_at',
        'reversed_by',
        'reversal_reason',
    ];

    protected $casts = [
        'customer_type' => InvoiceCustomerType::class,
        'status' => PaymentStatus::class,
        'method' => PaymentMethod::class,
        'amount' => 'decimal:3',
        'allocated_amount' => 'decimal:3',
        'unallocated_amount' => 'decimal:3',
        'paid_at' => 'datetime',
        'reversed_at' => 'datetime',
    ];

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    public function allocations(): HasMany
    {
        return $this->hasMany(PaymentAllocation::class);
    }

    public function activeAllocations(): HasMany
    {
        return $this->allocations()->whereNull('reversed_at');
    }

    public function invoices(): BelongsToMany
    {
        return $this->belongsToMany(Invoice::class, 'payment_allocations')
            ->withPivot(['amount', 'notes', 'reversed_at'])
            ->withTimestamps();
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function customerUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'customer_user_id');
    }

    public function recorder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }

    public function reverser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reversed_by');
    }
}
