<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'email',
        'telegram_id',
        'password',
        'is_admin',
        'role_id',
        'team_id',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
        'is_admin' => 'boolean',
        'telegram_id' => 'integer',
        'role_id' => 'integer',
        'team_id' => 'integer',
    ];

    public function favorites(): HasMany
    {
        return $this->hasMany(UserFavorite::class);
    }

    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class);
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    public function permissions(): BelongsToMany
    {
        return $this->role()
            ->first()
            ?->permissions()
            ?? $this->belongsToMany(Permission::class, 'role_permission', 'role_id', 'permission_id')->whereRaw('1 = 0');
    }

    public function roleName(): string
    {
        return (string) ($this->role?->name ?? ($this->is_admin ? Role::ADMIN : Role::USER));
    }

    public function isAdminRole(): bool
    {
        return $this->roleName() === Role::ADMIN;
    }

    public function hasRole(string|array $roles): bool
    {
        $roles = array_map('strtoupper', (array) $roles);

        return in_array($this->roleName(), $roles, true);
    }

    public function hasPermission(string $permission): bool
    {
        if ($this->isAdminRole()) {
            return true;
        }

        $role = $this->relationLoaded('role') ? $this->role : $this->role()->with('permissions')->first();

        return $role?->permissions->contains('name', $permission) ?? false;
    }

    /**
     * @return 'ALL'|'TEAM'|'SELF'|'NONE'
     */
    public function scopeFor(string $permission): string
    {
        if (! $this->hasPermission($permission)) {
            return 'NONE';
        }

        return match ($this->roleName()) {
            Role::ADMIN => 'ALL',
            Role::MANAGER => 'TEAM',
            Role::AGENT => 'SELF',
            default => 'SELF',
        };
    }

    public function permissionNames(): array
    {
        if ($this->isAdminRole()) {
            return Permission::query()->orderBy('name')->pluck('name')->all();
        }

        return $this->role()
            ->with('permissions:id,name')
            ->first()
            ?->permissions
            ->pluck('name')
            ->values()
            ->all() ?? [];
    }
}
