<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('documents', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')
                  ->constrained('users')
                  ->comment('Advogado que criou o documento');

            $table->foreignId('client_id')
                  ->constrained('clients')
                  ->comment('Cliente que deve assinar');

            $table->string('title')->comment('Título do documento, ex: Procuração ad Judicia');

            // Arquivos no storage
            $table->string('original_file_path', 500)->comment('Caminho do PDF original no storage');
            $table->string('signed_file_path', 500)->nullable()->comment('Caminho do PDF final assinado');

            // Token único para o link público de assinatura
            $table->uuid('signing_token')->unique()->comment('UUID v4 do link de assinatura do cliente');

            // Status do ciclo de vida do documento
            $table->enum('status', [
                'pending',        // aguardando assinatura do cliente
                'client_signed',  // cliente assinou, aguardando advogado
                'processing',     // assinatura do advogado em processamento (Job em fila)
                'completed',      // advogado assinou, documento finalizado
                'expired',        // link expirou sem assinatura
                'cancelled',      // cancelado pelo advogado
            ])->default('pending');

            // Integridade
            $table->string('original_hash', 64)->nullable()->comment('SHA-256 do PDF original');
            $table->string('final_hash', 64)->nullable()->comment('SHA-256 do PDF final assinado');

            // Controle de expiração do link público
            $table->timestamp('expires_at')->nullable()->comment('Data/hora de expiração do link de assinatura');

            // Timestamps de cada etapa
            $table->timestamp('client_signed_at')->nullable();
            $table->timestamp('completed_at')->nullable();

            $table->timestamps();

            $table->index('signing_token');
            $table->index(['user_id', 'status']);
            $table->index(['client_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('documents');
    }
};
