<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->uuid('batch_token')->nullable()->after('signing_token')
                  ->comment('Agrupa documentos enviados em lote para assinatura simultânea');

            $table->index('batch_token');
        });
    }

    public function down(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->dropIndex(['batch_token']);
            $table->dropColumn('batch_token');
        });
    }
};
