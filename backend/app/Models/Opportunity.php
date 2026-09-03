<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Enums\OpportunityStage;

class Opportunity extends Model
{
    /** @use HasFactory<\Database\Factories\OpportunityFactory> */
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'reference',
        'company_id',
        'primary_contact_id',
        'lead_id',
        'owner_id',
        'name',
        'service_interest',
        'stage',
        'probability',
        'estimated_value',
        'currency',
        'expected_close_date',
        'lost_reason',
        'notes',
        'closed_at',
        'created_by'
    ];

    protected $casts = [
        'expected_close_date' => 'date',
        'estimated_value' => 'decimal:2',
        'probability' => 'integer',
        'stage' => OpportunityStage::class,
        'closed_at' => 'datetime',
    ];

    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    public function primaryContact()
    {
        return $this->belongsTo(Contact::class, 'primary_contact_id');
    }

    public function sourceLead()
    {
        return $this->belongsTo(Lead::class, 'lead_id');
    }

    public function owner()
    {
        return $this->belongsTo(Employee::class, 'owner_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
