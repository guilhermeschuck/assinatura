<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Client extends Model
{
    protected $fillable = [
        'user_id',
        'name',
        'cpf',
        'email',
        'whatsapp',
    ];

    // ---------------------------------------------------------------------------
    // Relacionamentos
    // ---------------------------------------------------------------------------

    public function lawyer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function documents(): HasMany
    {
        return $this->hasMany(Document::class);
    }

    // ---------------------------------------------------------------------------
    // Accessors / Mutators
    // ---------------------------------------------------------------------------

    /** Formata CPF para exibição: 000.000.000-00 */
    public function getFormattedCpfAttribute(): string
    {
        $cpf = preg_replace('/\D/', '', $this->cpf);

        if (strlen($cpf) !== 11) {
            return $this->cpf;
        }

        return substr($cpf, 0, 3) . '.' .
               substr($cpf, 3, 3) . '.' .
               substr($cpf, 6, 3) . '-' .
               substr($cpf, 9, 2);
    }

    /** Formata WhatsApp para envio via API: 5511999999999 */
    public function getWhatsappNumericAttribute(): ?string
    {
        if (! $this->whatsapp) {
            return null;
        }

        return preg_replace('/\D/', '', $this->whatsapp);
    }
}
