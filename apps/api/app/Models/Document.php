<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class Document extends Model
{
    protected $appends = ['signing_url'];

    protected $fillable = [
        'user_id',
        'client_id',
        'title',
        'original_file_path',
        'signed_file_path',
        'signing_token',
        'batch_token',
        'status',
        'original_hash',
        'final_hash',
        'expires_at',
        'client_signed_at',
        'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'expires_at'       => 'datetime',
            'client_signed_at' => 'datetime',
            'completed_at'     => 'datetime',
        ];
    }

    // ---------------------------------------------------------------------------
    // Boot — gera token único automaticamente
    // ---------------------------------------------------------------------------

    protected static function booted(): void
    {
        static::creating(function (Document $document) {
            if (empty($document->signing_token)) {
                $document->signing_token = (string) Str::uuid();
            }

            // Expiração padrão: 7 dias
            if (empty($document->expires_at)) {
                $document->expires_at = now()->addDays(7);
            }
        });
    }

    // ---------------------------------------------------------------------------
    // Relacionamentos
    // ---------------------------------------------------------------------------

    public function lawyer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function signatures(): HasMany
    {
        return $this->hasMany(Signature::class);
    }

    public function clientSignature(): HasOne
    {
        return $this->hasOne(Signature::class)->where('signer_type', 'client');
    }

    public function lawyerSignature(): HasOne
    {
        return $this->hasOne(Signature::class)->where('signer_type', 'lawyer');
    }

    // ---------------------------------------------------------------------------
    // Scopes de status
    // ---------------------------------------------------------------------------

    public function scopePending(Builder $query): Builder
    {
        return $query->where('status', 'pending');
    }

    public function scopeClientSigned(Builder $query): Builder
    {
        return $query->where('status', 'client_signed');
    }

    public function scopeCompleted(Builder $query): Builder
    {
        return $query->where('status', 'completed');
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->whereNotIn('status', ['expired', 'cancelled']);
    }

    public function scopeExpired(Builder $query): Builder
    {
        return $query->where('expires_at', '<', now())
                     ->where('status', 'pending');
    }

    // ---------------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------------

    public function isExpired(): bool
    {
        return $this->expires_at && $this->expires_at->isPast() && $this->status === 'pending';
    }

    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    public function isClientSigned(): bool
    {
        return $this->status === 'client_signed';
    }

    public function isCompleted(): bool
    {
        return $this->status === 'completed';
    }

    /** URL pública para o cliente assinar */
    public function getSigningUrlAttribute(): string
    {
        return config('app.frontend_url') . '/sign/' . $this->signing_token;
    }

    /** URL temporária assinada para download do PDF final (S3 ou local) */
    public function getSignedFileUrlAttribute(): ?string
    {
        if (! $this->signed_file_path) {
            return null;
        }

        if (config('filesystems.default') === 's3') {
            return Storage::temporaryUrl($this->signed_file_path, now()->addMinutes(30));
        }

        return Storage::url($this->signed_file_path);
    }

    /** Rótulo de status em português para exibição no frontend */
    public function getStatusLabelAttribute(): string
    {
        return match ($this->status) {
            'pending'       => 'Aguardando Cliente',
            'client_signed' => 'Aguardando Advogado',
            'completed'     => 'Concluído',
            'expired'       => 'Expirado',
            'cancelled'     => 'Cancelado',
            default         => $this->status,
        };
    }

    /** Documentos do mesmo lote */
    public function batchDocuments()
    {
        if (! $this->batch_token) {
            return static::where('id', $this->id);
        }

        return static::where('batch_token', $this->batch_token);
    }

    /** URL pública do lote para o cliente assinar */
    public function getBatchSigningUrlAttribute(): ?string
    {
        if (! $this->batch_token) {
            return null;
        }

        return config('app.frontend_url') . '/sign/batch/' . $this->batch_token;
    }
}
