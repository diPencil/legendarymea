<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Lead extends Model
{
    use HasFactory, \Illuminate\Database\Eloquent\SoftDeletes;

    protected $guarded = ['id'];

    protected $casts = [
        'status' => \App\Enums\LeadStatus::class,
        'priority' => \App\Enums\LeadPriority::class,
        'source' => \App\Enums\LeadSource::class,
        'estimated_value' => 'decimal:2',
        'next_follow_up_at' => 'datetime',
        'converted_at' => 'datetime',
    ];

    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    public function contact()
    {
        return $this->belongsTo(Contact::class);
    }

    public function assignedTo()
    {
        return $this->belongsTo(Employee::class, 'assigned_to');
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
