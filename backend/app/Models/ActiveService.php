<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Enums\ActiveServiceStatus;

class ActiveService extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'service_catalog_id',
        'reference',
        'title',
        'description',
        'company_id',
        'contract_id',
        'client_onboarding_id',
        'status',
        'assigned_to',
        'start_date',
        'end_date',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'status' => ActiveServiceStatus::class,
    ];

    public function serviceCatalog()
    {
        return $this->belongsTo(ServiceCatalog::class);
    }

    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    public function contract()
    {
        return $this->belongsTo(Contract::class);
    }

    public function clientOnboarding()
    {
        return $this->belongsTo(ClientOnboarding::class);
    }

    public function assignee()
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function invoices()
    {
        return $this->hasMany(Invoice::class);
    }


}
