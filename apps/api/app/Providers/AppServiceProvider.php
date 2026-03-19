<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->applyMailSettingsFromDatabase();
    }

    /**
     * Sobrescreve as configurações de e-mail com os valores salvo no banco de dados.
     * Permite alterar o remetente e o servidor SMTP sem editar o .env.
     */
    private function applyMailSettingsFromDatabase(): void
    {
        try {
            $settings = \App\Models\Setting::many([
                'mail_from_name', 'mail_from_address', 'mail_mailer',
                'mail_host', 'mail_port', 'mail_username', 'mail_password', 'mail_encryption',
            ]);

            $map = [
                'mail_from_name'    => 'mail.from.name',
                'mail_from_address' => 'mail.from.address',
                'mail_mailer'       => 'mail.default',
                'mail_host'         => 'mail.mailers.smtp.host',
                'mail_port'         => 'mail.mailers.smtp.port',
                'mail_username'     => 'mail.mailers.smtp.username',
                'mail_password'     => 'mail.mailers.smtp.password',
                'mail_encryption'   => 'mail.mailers.smtp.scheme',
            ];

            foreach ($map as $dbKey => $configKey) {
                if (isset($settings[$dbKey]) && filled($settings[$dbKey])) {
                    config([$configKey => $settings[$dbKey]]);
                }
            }
        } catch (\Exception) {
            // Tabela ainda não existe (ex: primeira migração). Ignora silenciosamente.
        }
    }
}
