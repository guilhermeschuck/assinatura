<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('certificates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')
                  ->constrained('users')
                  ->cascadeOnDelete()
                  ->comment('Advogado dono do certificado');

            // Arquivo .pfx/.p12 armazenado fora do diretório public
            $table->string('file_path', 500)->comment('Caminho relativo no storage privado');

            // Senha criptografada com encrypt() do Laravel (AES-256-CBC)
            $table->text('password_encrypted')->comment('Senha do .pfx criptografada via Laravel encrypt()');

            // Metadados extraídos do certificado A1
            $table->string('issuer', 500)->nullable()->comment('Autoridade Certificadora ICP-Brasil emissora');
            $table->string('subject', 500)->nullable()->comment('Nome do titular no certificado');
            $table->string('serial_number', 100)->nullable();
            $table->string('cpf_cnpj', 20)->nullable()->comment('CPF/CNPJ extraído do certificado');
            $table->timestamp('valid_from')->nullable();
            $table->timestamp('valid_until')->nullable();

            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['user_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('certificates');
    }
};
