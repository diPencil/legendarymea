<?php

namespace App\Models;

use App\Enums\PaymentMethod;
use App\Enums\SupplierLedgerDirection;
use App\Enums\SupplierLedgerType;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SupplierLedgerEntry extends Model
{
    use HasFactory;

    protected $fillable = [
        'reference',
        'supplier_id',
        'supplier_balance_account_id',
        'currency',
        'type',
        'direction',
        'amount',
        'balance_before',
        'balance_after',
        'invoice_id',
        'invoice_item_id',
        'transaction_date',
        'payment_method',
        'external_reference',
        'notes',
        'created_by',
        'reversal_of_id',
    ];

    protected $casts = [
        'type' => SupplierLedgerType::class,
        'direction' => SupplierLedgerDirection::class,
        'payment_method' => PaymentMethod::class,
        'amount' => 'decimal:2',
        'balance_before' => 'decimal:2',
        'balance_after' => 'decimal:2',
        'transaction_date' => 'date',
    ];

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function balanceAccount(): BelongsTo
    {
        return $this->belongsTo(SupplierBalanceAccount::class, 'supplier_balance_account_id');
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    public function invoiceItem(): BelongsTo
    {
        return $this->belongsTo(InvoiceItem::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function reversalOf(): BelongsTo
    {
        return $this->belongsTo(self::class, 'reversal_of_id');
    }
}
