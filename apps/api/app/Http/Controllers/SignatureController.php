<?php

namespace App\Http\Controllers;

use App\Jobs\ApplyAdvogadoSignature;
use App\Models\Document;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SignatureController extends Controller
{
    /**
     * Inicia o processo de assinatura digital do advogado com o Certificado A1.
     * O processamento pesado é delegado para um Job em fila.
     */
    public function signAsLawyer(Request $request, Document $document): JsonResponse
    {
        abort_if(! in_array($document->user_id, User::teamUserIds()), 403);
        abort_if(! $document->isClientSigned(), 422, 'O documento precisa ter sido assinado pelo cliente primeiro.');

        $lawyer = $request->user();

        $certificate = User::teamActiveCertificate();

        abort_if(! $certificate, 422, 'Nenhum Certificado A1 ativo e válido encontrado. Configure seu certificado em Configurações.');

        // Marca como "processando" para evitar duplo clique
        $document->update(['status' => 'processing']);

        ApplyAdvogadoSignature::dispatch($document, $certificate, $lawyer)
            ->onQueue('signatures');

        return response()->json([
            'message' => 'Assinatura em processamento. O documento ficará disponível em breve.',
        ]);
    }
}
