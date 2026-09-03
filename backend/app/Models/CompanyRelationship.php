<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CompanyRelationship extends Model
{
    protected $fillable = ['company_id', 'type'];

    public function company()
    {
        return $this->belongsTo(Company::class);
    }
}
