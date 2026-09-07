<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;
use App\Enums\UserStatus;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasApiTokens, HasFactory, Notifiable, HasRoles;

    protected $guard_name = 'web';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'company_id',
        'username',
        'email',
        'password',
        'must_change_password',
        'account_invite_status',
        'account_invited_at',
        'account_invite_failed_at',
        'status',
        'preferred_locale',
        'timezone',
        'last_login_at',
        'portal_invited_at',
        'portal_disabled_at',
        'avatar_path',
        'avatar_media_id',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'must_change_password' => 'boolean',
            'status' => UserStatus::class,
            'account_invited_at' => 'datetime',
            'account_invite_failed_at' => 'datetime',
            'last_login_at' => 'datetime',
            'portal_invited_at' => 'datetime',
            'portal_disabled_at' => 'datetime',
        ];
    }

    public function employee()
    {
        return $this->hasOne(Employee::class);
    }

    public function avatarMedia()
    {
        return $this->belongsTo(MediaFile::class, 'avatar_media_id');
    }

    public function company()
    {
        return $this->belongsTo(Company::class);
    }
}
