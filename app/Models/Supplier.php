<?php

namespace App\Models;

use App\Enums\SupplierStatus;
use App\Enums\SupplierType;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Supplier extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'reference',
        'type',
        'linked_user_id',
        'linked_company_id',
        'name',
        'address',
        'mobile',
        'email',
        'status',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'type' => SupplierType::class,
        'status' => SupplierStatus::class,
    ];

    public function linkedUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'linked_user_id');
    }

    public function linkedCompany(): BelongsTo
    {
        return $this->belongsTo(Company::class, 'linked_company_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function balanceAccounts(): HasMany
    {
        return $this->hasMany(SupplierBalanceAccount::class);
    }

    public function ledgerEntries(): HasMany
    {
        return $this->hasMany(SupplierLedgerEntry::class);
    }

    public function invoiceItems(): HasMany
    {
        return $this->hasMany(InvoiceItem::class);
    }
}
