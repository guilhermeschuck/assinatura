<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class Signature extends Model
{
    protected $fillable = [
        'document_id',
        'signer_type',
        'signer_id',
        'signer_name',
        'signer_cpf',
        'signer_email',
        'ip_address',
        'user_agent',
        'latitude',
        'longitude',
        'timezone',
        'selfie_path',
        'signature_type',
        'certificate_id',
        'document_hash',
        'signed_at',
    ];

    protected function casts(): array
    {
        return [
            'signed_at' => 'datetime',
            'latitude'  => 'decimal:8',
            'longitude' => 'decimal:8',
        ];
    }

    // ---------------------------------------------------------------------------
    // Relacionamentos
    // ---------------------------------------------------------------------------

    public function document(): BelongsTo
    {
        return $this->belongsTo(Document::class);
    }

    /** Advogado que assinou (null para clientes sem conta) */
    public function signer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'signer_id');
    }

    public function certificate(): BelongsTo
    {
        return $this->belongsTo(Certificate::class);
    }

    // ---------------------------------------------------------------------------
    // Scopes
    // ---------------------------------------------------------------------------

    public function scopeByClient($query)
    {
        return $query->where('signer_type', 'client');
    }

    public function scopeByLawyer($query)
    {
        return $query->where('signer_type', 'lawyer');
    }

    // ---------------------------------------------------------------------------
    // Accessors
    // ---------------------------------------------------------------------------

    /** URL temporária da selfie (S3 ou storage local) */
    public function getSelfieUrlAttribute(): ?string
    {
        if (! $this->selfie_path) {
            return null;
        }

        if (config('filesystems.default') === 's3') {
            return Storage::temporaryUrl($this->selfie_path, now()->addMinutes(15));
        }

        return Storage::url($this->selfie_path);
    }

    /** Rótulo do tipo de assinatura para exibição */
    public function getSignatureTypeLabelAttribute(): string
    {
        return match ($this->signature_type) {
            'electronic'  => 'Assinatura Eletrônica Avançada',
            'digital_icp' => 'Assinatura Digital ICP-Brasil (A1)',
            default       => $this->signature_type,
        };
    }

    /** Dados de geolocalização como array */
    public function getGeolocationAttribute(): ?array
    {
        if (! $this->latitude || ! $this->longitude) {
            return null;
        }

        return [
            'latitude'  => (float) $this->latitude,
            'longitude' => (float) $this->longitude,
        ];
    }

    public function isClientSignature(): bool
    {
        return $this->signer_type === 'client';
    }

    public function isLawyerSignature(): bool
    {
        return $this->signer_type === 'lawyer';
    }
}
