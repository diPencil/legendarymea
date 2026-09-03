<?php

namespace App\Models;

use App\Enums\EmailStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class EmailMessage extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'reference',
        'subject',
        'body',
        'to_address',
        'to_name',
        'cc',
        'bcc',
        'status',
        'template_id',
        'inquiry_id',
        'created_by',
        'sent_at',
        'failure_message',
    ];

    protected $casts = [
        'status' => EmailStatus::class,
        'sent_at' => 'datetime',
        'cc' => 'array',
        'bcc' => 'array',
    ];

    public function template()
    {
        return $this->belongsTo(EmailTemplate::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function inquiry()
    {
        return $this->belongsTo(Inquiry::class);
    }
}
