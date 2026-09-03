<?php

namespace App\Models;

use App\Enums\RenewalStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Renewal extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'reference',
        'company_id',
        'contract_id',
        'active_service_id',
        'status',
        'renewal_due_date',
        'proposed_start_date',
        'proposed_end_date',
        'renewal_amount',
        'currency',
        'assigned_to',
        'renewed_contract_id',
        'completed_at',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'status' => RenewalStatus::class,
        'renewal_due_date' => 'date',
        'proposed_start_date' => 'date',
        'proposed_end_date' => 'date',
        'renewal_amount' => 'decimal:2',
        'completed_at' => 'datetime',
    ];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function contract(): BelongsTo
    {
        return $this->belongsTo(Contract::class);
    }

    public function activeService(): BelongsTo
    {
        return $this->belongsTo(ActiveService::class);
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function renewedContract(): BelongsTo
    {
        return $this->belongsTo(Contract::class, 'renewed_contract_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
