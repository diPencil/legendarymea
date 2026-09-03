<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Company extends Model
{
    /** @use HasFactory<\Database\Factories\CompanyFactory> */
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'reference',
        'name',
        'legal_name',
        'business_type',
        'status',
        'country_code',
        'city',
        'website',
        'email',
        'phone',
        'tax_number',
        'registration_number',
        'account_manager_id',
        'source',
        'notes',
        'created_by',
    ];

    public function accountManager()
    {
        return $this->belongsTo(Employee::class, 'account_manager_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function companyRelationships()
    {
        return $this->hasMany(CompanyRelationship::class);
    }

    public function documents(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(Document::class);
    }

    public function quotations(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(Quotation::class);
    }

    public function contracts(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(Contract::class);
    }

    public function crmActivities()
    {
        return $this->hasMany(CrmActivity::class);
    }

    public function contacts()
    {
        return $this->hasMany(Contact::class);
    }

    public function primaryContact()
    {
        return $this->hasOne(Contact::class)->where('is_primary', true);
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

    public function payments(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function renewals(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(Renewal::class);
    }
}
