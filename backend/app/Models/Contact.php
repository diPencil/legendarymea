<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Contact extends Model
{
    /** @use HasFactory<\Database\Factories\ContactFactory> */
    use HasFactory, \Illuminate\Database\Eloquent\SoftDeletes;

    protected $fillable = [
        'reference',
        'company_id',
        'first_name',
        'last_name',
        'job_title',
        'department',
        'email',
        'phone',
        'country_code',
        'is_primary',
        'status',
        'preferred_locale',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'is_primary' => 'boolean',
        'status' => \App\Enums\ContactStatus::class,
    ];

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

    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function crmActivities()
    {
        return $this->morphMany(CrmActivity::class, 'subject');
    }
}
