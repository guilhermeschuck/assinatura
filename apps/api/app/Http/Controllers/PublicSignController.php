<?php

namespace App\Http\Controllers;

use App\Jobs\ApplyAdvogadoSignature;
use App\Models\Document;
use App\Models\Signature;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class PublicSignController extends Controller
{
    /**
     * Retorna os dados do documento para o cliente visualizar.
     * Rota pública — sem autenticação.
     */
    public function show(string $token): JsonResponse
    {
        $document = Document::with(['client', 'lawyer'])
            ->where('signing_token', $token)
            ->firstOrFail();

        if ($document->isExpired()) {
            $document->update(['status' => 'expired']);
            abort(410, 'Este link de assinatura expirou.');
        }

        abort_if(! $document->isPending(), 422, 'Este documento não está disponível para assinatura.');

        return response()->json([
            'data' => [
                'document' => [
                    'id'          => $document->id,
                    'title'       => $document->title,
                    'status'      => $document->status,
                    'expires_at'  => $document->expires_at,
                    'lawyer_name' => $document->lawyer->name,
                    'oab_number'  => $document->lawyer->oab_number,
                ],
                'client' => [
                    'name'     => $document->client->name,
                    'cpf'      => $document->client->cpf,
                    'email'    => $document->client->email,
                ],
            ],
        ]);
    }

    /**
     * Retorna o PDF original para visualização no browser do cliente.
     */
    public function pdf(string $token): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        $document = Document::where('signing_token', $token)->firstOrFail();

        abort_if(! $document->isPending(), 422, 'Documento não disponível.');

        return Storage::response($document->original_file_path, $document->title . '.pdf', [
            'Content-Type' => 'application/pdf',
        ]);
    }

    /**
     * Recebe as evidências eletrônicas e registra a assinatura do cliente.
     */
    public function store(Request $request, string $token): JsonResponse
    {
        $document = Document::with('client')
            ->where('signing_token', $token)
            ->firstOrFail();

        if ($document->isExpired()) {
            $document->update(['status' => 'expired']);
            abort(410, 'Este link de assinatura expirou.');
        }

        abort_if(! $document->isPending(), 422, 'Este documento não está disponível para assinatura.');

        $request->validate([
            'accepted_terms' => ['required', 'accepted'],
            'selfie'         => ['required', 'file', 'mimes:jpg,jpeg,png,webp', 'max:10240'],
            'latitude'       => ['nullable', 'numeric', 'between:-90,90'],
            'longitude'      => ['nullable', 'numeric', 'between:-180,180'],
            'timezone'       => ['nullable', 'string', 'max:50'],
        ]);

        // Armazena a selfie em disco privado
        $selfiePath = $request->file('selfie')->store(
            "signatures/{$document->id}/selfies",
            'local',
        );

        // Hash do documento no momento exato da assinatura
        $documentHash = hash_file('sha256', Storage::path($document->original_file_path));

        Signature::create([
            'document_id'    => $document->id,
            'signer_type'    => 'client',
            'signer_id'      => null,
            'signer_name'    => $document->client->name,
            'signer_cpf'     => $document->client->cpf,
            'signer_email'   => $document->client->email,
            'ip_address'     => $request->ip(),
            'user_agent'     => $request->userAgent(),
            'latitude'       => $request->latitude,
            'longitude'      => $request->longitude,
            'timezone'       => $request->timezone ?? 'America/Sao_Paulo',
            'selfie_path'    => $selfiePath,
            'signature_type' => 'electronic',
            'document_hash'  => $documentHash,
            'signed_at'      => now(),
        ]);

        $document->update([
            'status'           => 'client_signed',
            'client_signed_at' => now(),
        ]);

        // Notifica o advogado
        $document->lawyer->notify(new \App\Notifications\ClientSignedDocument($document));

        // Assinatura automática com Certificado A1 do advogado
        $lawyer      = $document->lawyer;
        $certificate = $lawyer->activeCertificate()->valid()->first();

        if ($certificate) {
            $document->update(['status' => 'processing']);

            ApplyAdvogadoSignature::dispatch($document, $certificate, $lawyer)
                ->onQueue('signatures');

            Log::info('Assinatura automática do advogado disparada', [
                'document_id'    => $document->id,
                'certificate_id' => $certificate->id,
            ]);
        } else {
            Log::warning('Nenhum certificado A1 ativo para assinatura automática', [
                'document_id' => $document->id,
                'lawyer_id'   => $lawyer->id,
            ]);
        }

        return response()->json([
            'message' => 'Documento assinado com sucesso! A assinatura digital do advogado será aplicada automaticamente.',
        ]);
    }
}
