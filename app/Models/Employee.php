<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Employee extends Model
{
    /** @use HasFactory<\Database\Factories\EmployeeFactory> */
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'user_id',
        'employee_code',
        'job_title',
        'department',
        'phone',
        'country_code',
        'personal_email',
        'bank_account_number',
        'national_address',
        'identity_document_path',
        'identity_document_original_name',
        'identity_document_mime_type',
        'identity_document_size',
        'identity_document_uploaded_by',
        'identity_document_uploaded_at',
        'status',
        'is_sales_eligible',
        'show_on_team',
        'hire_date',
        'manager_id',
        'notes',
    ];

    protected $casts = [
        'hire_date' => 'date',
        'is_sales_eligible' => 'boolean',
        'bank_account_number' => 'encrypted',
        'national_address' => 'encrypted',
        'identity_document_uploaded_at' => 'datetime',
        'show_on_team' => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function manager()
    {
        return $this->belongsTo(Employee::class, 'manager_id');
    }

    public function directReports()
    {
        return $this->hasMany(Employee::class, 'manager_id');
    }

    public function identityDocumentUploader()
    {
        return $this->belongsTo(User::class, 'identity_document_uploaded_by');
    }

    public function documents()
    {
        return $this->hasMany(EmployeeDocument::class);
    }
}
