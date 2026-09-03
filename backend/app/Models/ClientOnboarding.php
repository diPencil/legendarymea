<?php

namespace App\Models;

use App\Enums\ClientOnboardingStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class ClientOnboarding extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'reference',
        'company_id',
        'contract_id',
        'status',
        'assigned_to',
        'kickoff_date',
        'target_go_live_date',
        'completed_at',
        'requirements',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'status' => ClientOnboardingStatus::class,
        'kickoff_date' => 'date',
        'target_go_live_date' => 'date',
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

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function activeServices(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(ActiveService::class);
    }
}
