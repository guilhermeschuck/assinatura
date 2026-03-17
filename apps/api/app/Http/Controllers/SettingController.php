<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SettingController extends Controller
{
    private const MAIL_KEYS = [
        'mail_from_name',
        'mail_from_address',
        'mail_mailer',
        'mail_host',
        'mail_port',
        'mail_username',
        'mail_password',
        'mail_encryption',
    ];

    public function index(Request $request): JsonResponse
    {
        abort_if(! $request->user()->isAdmin(), 403);

        $settings = Setting::whereIn('key', self::MAIL_KEYS)
            ->pluck('value', 'key')
            ->map(fn ($v) => $v ?? ''); // nunca retorna null — inputs controlados precisam de string

        // Nunca expõe a senha preenchida
        if ($settings->has('mail_password') && filled($settings->get('mail_password'))) {
            $settings->put('mail_password', '••••••••');
        }

        return response()->json(['data' => $settings]);
    }

    public function update(Request $request): JsonResponse
    {
        abort_if(! $request->user()->isAdmin(), 403);

        $data = $request->validate([
            'mail_from_name'    => ['required', 'string', 'max:100'],
            'mail_from_address' => ['required', 'email', 'max:150'],
            'mail_mailer'       => ['required', Rule::in(['smtp', 'log', 'sendmail'])],
            'mail_host'         => ['nullable', 'string', 'max:255'],
            'mail_port'         => ['nullable', 'string', 'max:5'],
            'mail_username'     => ['nullable', 'string', 'max:255'],
            'mail_password'     => ['nullable', 'string', 'max:255'],
            'mail_encryption'   => ['nullable', Rule::in(['tls', 'ssl', ''])],
        ]);

        foreach ($data as $key => $value) {
            // Não sobrescreve a senha se vier como placeholder
            if ($key === 'mail_password' && str_starts_with((string) $value, '•')) {
                continue;
            }
            Setting::set($key, $value ?? '');
        }

        return response()->json(['message' => 'Configurações salvas com sucesso.']);
    }
}
