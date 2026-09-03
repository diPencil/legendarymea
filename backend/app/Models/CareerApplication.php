<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class CareerApplication extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'reference',
        'career_id',
        'name',
        'email',
        'phone',
        'resume_path',
        'cover_letter',
        'status',
        'assigned_to',
        'internal_notes',
    ];

    protected $hidden = [
        'resume_path',
    ];

    public function career()
    {
        return $this->belongsTo(Career::class);
    }

    public function assignee()
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }
}
