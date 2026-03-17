<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('clients', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')
                  ->constrained('users')
                  ->cascadeOnDelete()
                  ->comment('Advogado responsável pelo cliente');
            $table->string('name');
            $table->string('cpf', 14)->comment('Formato: XXX.XXX.XXX-XX');
            $table->string('email');
            $table->string('whatsapp', 20)->nullable();
            $table->timestamps();

            $table->index(['user_id', 'cpf']);
            $table->index('email');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('clients');
    }
};
