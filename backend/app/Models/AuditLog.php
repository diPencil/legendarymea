<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class AuditLog extends Model
{
    protected $fillable = [
        'user_id',
        'action',
        'subject_type',
        'subject_id',
        'old_values',
        'new_values',
        'request_context',
    ];

    protected $casts = [
        'old_values' => 'array',
        'new_values' => 'array',
        'request_context' => 'array',
    ];

    public function subject(): MorphTo
    {
        return $this->morphTo();
    }
}
