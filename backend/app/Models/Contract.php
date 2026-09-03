<?php

namespace App\Models;

use App\Enums\ContractStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Contract extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'reference',
        'title',
        'company_id',
        'contact_id',
        'quotation_id',
        'status',
        'start_date',
        'end_date',
        'signed_at',
        'contract_value',
        'currency',
        'terms',
        'notes',
        'contract_content',
        'created_by',
        'additional_terms_en',
        'additional_terms_ar',
        'scope_of_work_en',
        'scope_of_work_ar',
        'payment_terms_en',
        'payment_terms_ar',
    ];

    protected $casts = [
        'status' => ContractStatus::class,
        'start_date' => 'date',
        'end_date' => 'date',
        'signed_at' => 'datetime',
        'contract_value' => 'decimal:2',
        'contract_content' => 'array',
    ];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }

    public function quotation(): BelongsTo
    {
        return $this->belongsTo(Quotation::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function clientOnboardings(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(ClientOnboarding::class);
    }

    public function activeServices(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(ActiveService::class);
    }

    public function invoices(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(Invoice::class);
    }

    public function renewals(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(Renewal::class);
    }

    public function renewalSuccessors(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(Renewal::class, 'renewed_contract_id');
    }
}
