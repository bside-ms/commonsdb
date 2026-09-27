<?php

namespace App\Models;

use App\Enums\PlatformRole;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable(['name', 'email', 'password', 'auth_provider', 'provider_subject_id'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    use HasApiTokens, HasUuids, Notifiable;

    /**
     * platform_role has a database default, but Eloquent doesn't read
     * schema defaults — a freshly created model would hold null until
     * refreshed. Declaring it here keeps PHP and the database in
     * agreement, and matters because the column is deliberately not
     * fillable.
     *
     * @var array<string, string>
     */
    protected $attributes = [
        'platform_role' => 'member',
    ];

    /**
     * platform_role is deliberately not fillable: role changes go
     * through an explicit superadmin action in slice 4, never through
     * mass assignment from a request payload.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'platform_role' => PlatformRole::class,
        ];
    }

    public function profile(): HasOne
    {
        return $this->hasOne(Profile::class);
    }

    public function isSuperadmin(): bool
    {
        return $this->platform_role === PlatformRole::Superadmin;
    }
}
