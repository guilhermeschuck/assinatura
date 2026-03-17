<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('settings', function (Blueprint $table) {
            $table->string('key')->primary();
            $table->text('value')->nullable();
        });

        // Seed com os valores padrão do .env
        DB::table('settings')->insert([
            ['key' => 'mail_from_name',    'value' => env('APP_NAME', 'Assinatura Jurídica')],
            ['key' => 'mail_from_address', 'value' => env('MAIL_FROM_ADDRESS', 'assinatura@escritorio.com.br')],
            ['key' => 'mail_mailer',       'value' => env('MAIL_MAILER', 'smtp')],
            ['key' => 'mail_host',         'value' => env('MAIL_HOST', '127.0.0.1')],
            ['key' => 'mail_port',         'value' => env('MAIL_PORT', '1025')],
            ['key' => 'mail_username',     'value' => env('MAIL_USERNAME', '')],
            ['key' => 'mail_password',     'value' => env('MAIL_PASSWORD', '')],
            ['key' => 'mail_encryption',   'value' => env('MAIL_ENCRYPTION', '')],
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('settings');
    }
};
