<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    public $timestamps    = false;
    public $incrementing  = false;
    protected $primaryKey = 'key';
    protected $keyType    = 'string';

    protected $fillable = ['key', 'value'];

    /**
     * Busca o valor de uma chave, com fallback opcional.
     */
    public static function get(string $key, mixed $default = null): mixed
    {
        return static::where('key', $key)->value('value') ?? $default;
    }

    /**
     * Define o valor de uma chave (upsert).
     */
    public static function set(string $key, mixed $value): void
    {
        static::updateOrCreate(['key' => $key], ['value' => $value]);
    }

    /**
     * Retorna múltiplas chaves como array associativo.
     */
    public static function many(array $keys): array
    {
        return static::whereIn('key', $keys)->pluck('value', 'key')->toArray();
    }
}
