<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('signatures', function (Blueprint $table) {
            $table->string('signature_path', 500)
                  ->nullable()
                  ->after('selfie_path')
                  ->comment('Caminho da assinatura/rubrica manuscrita no storage');
        });
    }

    public function down(): void
    {
        Schema::table('signatures', function (Blueprint $table) {
            $table->dropColumn('signature_path');
        });
    }
};
