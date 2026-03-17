<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Crypt;

class Certificate extends Model
{
    protected $fillable = [
        'user_id',
        'file_path',
        'password_encrypted',
        'issuer',
        'subject',
        'serial_number',
        'cpf_cnpj',
        'valid_from',
        'valid_until',
        'is_active',
    ];

    protected $hidden = [
        'password_encrypted',
        'file_path',
    ];

    protected function casts(): array
    {
        return [
            'valid_from'  => 'datetime',
            'valid_until' => 'datetime',
            'is_active'   => 'boolean',
        ];
    }

    // ---------------------------------------------------------------------------
    // Mutator/Accessor para a senha — nunca é exposta em texto plano
    // ---------------------------------------------------------------------------

    /** Descriptografa a senha do certificado A1 para uso interno no backend */
    public function getDecryptedPasswordAttribute(): string
    {
        return Crypt::decryptString($this->password_encrypted);
    }

    /** Grava a senha sempre criptografada */
    public function setPasswordEncryptedAttribute(string $value): void
    {
        // Aceita tanto a senha em texto puro quanto já criptografada
        try {
            Crypt::decryptString($value); // já está criptografada
            $this->attributes['password_encrypted'] = $value;
        } catch (\Exception) {
            $this->attributes['password_encrypted'] = Crypt::encryptString($value);
        }
    }

    // ---------------------------------------------------------------------------
    // Relacionamentos
    // ---------------------------------------------------------------------------

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function signatures(): HasMany
    {
        return $this->hasMany(Signature::class);
    }

    // ---------------------------------------------------------------------------
    // Scopes
    // ---------------------------------------------------------------------------

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeValid($query)
    {
        return $query->where('valid_until', '>', now());
    }

    // ---------------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------------

    public function isExpired(): bool
    {
        return $this->valid_until && $this->valid_until->isPast();
    }

    public function isExpiringSoon(int $days = 30): bool
    {
        return $this->valid_until && $this->valid_until->isBefore(now()->addDays($days));
    }

    public function getDaysUntilExpirationAttribute(): ?int
    {
        if (! $this->valid_until) {
            return null;
        }

        return (int) now()->diffInDays($this->valid_until, false);
    }
}
