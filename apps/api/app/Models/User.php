<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'oab_number',
        'role',
        'phone',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password'          => 'hashed',
        ];
    }

    // ---------------------------------------------------------------------------
    // Relacionamentos
    // ---------------------------------------------------------------------------

    public function clients(): HasMany
    {
        return $this->hasMany(Client::class);
    }

    public function documents(): HasMany
    {
        return $this->hasMany(Document::class);
    }

    /** Certificado A1 ativo do advogado */
    public function activeCertificate(): HasOne
    {
        return $this->hasOne(Certificate::class)->where('is_active', true)->latestOfMany();
    }

    public function certificates(): HasMany
    {
        return $this->hasMany(Certificate::class);
    }

    // ---------------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------------

    /** IDs de todos os membros da equipe (conta compartilhada) */
    public static function teamUserIds(): array
    {
        return static::pluck('id')->toArray();
    }

    /** Certificado A1 ativo de qualquer membro da equipe */
    public static function teamActiveCertificate(): ?Certificate
    {
        return Certificate::whereIn('user_id', static::teamUserIds())
            ->where('is_active', true)
            ->where('valid_until', '>', now())
            ->latest()
            ->first();
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function isLawyer(): bool
    {
        return $this->role === 'lawyer';
    }
}
