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
        'status',
        'is_sales_eligible',
        'hire_date',
        'manager_id',
        'notes',
    ];

    protected $casts = [
        'hire_date' => 'date',
        'is_sales_eligible' => 'boolean',
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
}

