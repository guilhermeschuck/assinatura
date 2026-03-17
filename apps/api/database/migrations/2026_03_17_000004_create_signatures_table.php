<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('signatures', function (Blueprint $table) {
            $table->id();

            $table->foreignId('document_id')
                  ->constrained('documents')
                  ->cascadeOnDelete();

            // Quem assinou
            $table->enum('signer_type', ['client', 'lawyer']);
            $table->foreignId('signer_id')
                  ->nullable()
                  ->constrained('users')
                  ->comment('user_id para advogado; null para cliente (sem conta)');

            // Dados de identificação do assinante (sempre preenchido para o cliente)
            $table->string('signer_name')->nullable();
            $table->string('signer_cpf', 14)->nullable();
            $table->string('signer_email')->nullable();

            // Evidências eletrônicas (Lei 14.063/2020, Art. 4º, II)
            $table->ipAddress('ip_address')->nullable()->comment('IP público do assinante');
            $table->text('user_agent')->nullable();
            $table->decimal('latitude', 10, 8)->nullable();
            $table->decimal('longitude', 11, 8)->nullable();
            $table->string('timezone', 50)->nullable();

            // Selfie com documento (prova biométrica)
            $table->string('selfie_path', 500)->nullable()->comment('Caminho da foto no storage');

            // Tipo da assinatura
            $table->enum('signature_type', ['electronic', 'digital_icp'])
                  ->comment('electronic = avançada (cliente) | digital_icp = A1 ICP-Brasil (advogado)');

            // Referência ao certificado usado (advogado)
            $table->foreignId('certificate_id')
                  ->nullable()
                  ->constrained('certificates')
                  ->nullOnDelete();

            // Hash do documento no momento exato da assinatura
            $table->string('document_hash', 64)->nullable()->comment('SHA-256 do documento no momento da assinatura');

            // Carimbo de tempo
            $table->timestamp('signed_at');

            $table->timestamps();

            $table->index(['document_id', 'signer_type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('signatures');
    }
};
