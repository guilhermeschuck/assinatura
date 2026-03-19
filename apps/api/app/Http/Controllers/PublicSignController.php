<?php

namespace App\Http\Controllers;

use App\Jobs\ApplyAdvogadoSignature;
use App\Models\Document;
use App\Models\Signature;
use App\Models\User;
use App\Services\ActivityService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

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
            'signature'      => ['required', 'file', 'mimes:png,jpg,jpeg,webp', 'max:5120'],
            'latitude'       => ['required', 'numeric', 'between:-90,90'],
            'longitude'      => ['required', 'numeric', 'between:-180,180'],
            'timezone'       => ['nullable', 'string', 'max:50'],
        ]);

        // Armazena a selfie em disco privado
        $selfiePath = $request->file('selfie')->store(
            "signatures/{$document->id}/selfies",
            'local',
        );

        // Armazena a assinatura/rubrica manuscrita em disco privado
        $signaturePath = $request->file('signature')->store(
            "signatures/{$document->id}/signatures",
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
            'signature_path' => $signaturePath,
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

        ActivityService::log(
            action:      'client_signed',
            description: "{$document->client->name} assinou eletronicamente o documento \"{$document->title}\" (IP: {$request->ip()})",
            user:        null, // ação do cliente, sem conta no sistema
            subject:     $document,
            metadata:    ['client_name' => $document->client->name, 'client_email' => $document->client->email, 'ip' => $request->ip()],
        );

        // Assinatura automática com Certificado A1 da equipe
        $lawyer      = $document->lawyer;
        $certificate = User::teamActiveCertificate();

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

    /**
     * Download público do PDF assinado (link enviado por e-mail ao cliente).
     */
    public function downloadSigned(string $token): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        $document = Document::where('signing_token', $token)
            ->where('status', 'completed')
            ->firstOrFail();

        abort_if(! $document->signed_file_path, 404, 'Documento assinado não disponível.');

        $filename = str($document->title)->slug()->append('.pdf')->toString();

        return Storage::download($document->signed_file_path, $filename);
    }

    /**
     * Verificação pública de autenticidade do documento.
     * Retorna dados de assinatura para confirmar identidade do signatário.
     */
    public function verify(string $token): JsonResponse
    {
        // Aceita UUIDs completos e parciais (caso truncados no PDF)
        if (!preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{6,12}$/i', $token)) {
            abort(404, 'Documento não encontrado ou token inválido.');
        }

        $isFullUuid = strlen($token) === 36;

        if ($isFullUuid) {
            $document = Document::with(['client', 'lawyer', 'clientSignature', 'lawyerSignature.certificate'])
                ->where('signing_token', $token)
                ->first();
        } else {
            // Token truncado — busca por prefixo usando cast para text (coluna UUID no PostgreSQL)
            $document = Document::with(['client', 'lawyer', 'clientSignature', 'lawyerSignature.certificate'])
                ->whereRaw('signing_token::text LIKE ?', [$token . '%'])
                ->first();
        }

        abort_if(! $document, 404, 'Documento não encontrado ou token inválido.');

        $clientSig = $document->clientSignature;
        $lawyerSig = $document->lawyerSignature;

        $selfieUrl = null;
        if ($clientSig?->selfie_path && Storage::disk('local')->exists($clientSig->selfie_path)) {
            $content = Storage::disk('local')->get($clientSig->selfie_path);
            $mime    = Storage::disk('local')->mimeType($clientSig->selfie_path);
            $selfieUrl = "data:{$mime};base64," . base64_encode($content);
        }

        $signatureUrl = null;
        if ($clientSig?->signature_path && Storage::disk('local')->exists($clientSig->signature_path)) {
            $content = Storage::disk('local')->get($clientSig->signature_path);
            $mime    = Storage::disk('local')->mimeType($clientSig->signature_path);
            $signatureUrl = "data:{$mime};base64," . base64_encode($content);
        }

        return response()->json([
            'data' => [
                'document' => [
                    'title'         => $document->title,
                    'status'        => $document->status,
                    'original_hash' => $document->original_hash,
                    'final_hash'    => $document->final_hash,
                    'created_at'    => $document->created_at,
                    'completed_at'  => $document->completed_at,
                ],
                'client' => [
                    'name'  => $document->client->name,
                    'cpf'   => $this->maskCpf($document->client->cpf),
                    'email' => $this->maskEmail($document->client->email),
                ],
                'client_signature' => $clientSig ? [
                    'signed_at'     => $clientSig->signed_at,
                    'ip_address'    => $clientSig->ip_address,
                    'geolocation'   => $clientSig->latitude && $clientSig->longitude
                        ? "{$clientSig->latitude}, {$clientSig->longitude}"
                        : null,
                    'timezone'      => $clientSig->timezone,
                    'selfie_url'    => $selfieUrl,
                    'signature_url' => $signatureUrl,
                ] : null,
                'lawyer' => [
                    'name'       => $document->lawyer->name,
                    'oab_number' => $document->lawyer->oab_number,
                ],
                'lawyer_signature' => $lawyerSig ? [
                    'signed_at'    => $lawyerSig->signed_at,
                    'certificate'  => [
                        'subject'     => $lawyerSig->certificate?->subject,
                        'issuer'      => $lawyerSig->certificate?->issuer,
                        'valid_from'  => $lawyerSig->certificate?->valid_from,
                        'valid_until' => $lawyerSig->certificate?->valid_until,
                    ],
                ] : null,
            ],
        ]);
    }

    private function maskCpf(string $cpf): string
    {
        $clean = preg_replace('/\D/', '', $cpf);
        if (strlen($clean) === 11) {
            return substr($clean, 0, 3) . '.***.***.'. substr($clean, -2);
        }
        return $cpf;
    }

    private function maskEmail(string $email): string
    {
        $parts = explode('@', $email);
        if (count($parts) !== 2) {
            return $email;
        }
        $name = $parts[0];
        $masked = substr($name, 0, 2) . str_repeat('*', max(1, strlen($name) - 2));
        return $masked . '@' . $parts[1];
    }

    // -----------------------------------------------------------------------
    // Assinatura em lote (batch)
    // -----------------------------------------------------------------------

    /**
     * Retorna todos os documentos pendentes do lote para o cliente.
     */
    public function showBatch(string $batchToken): JsonResponse
    {
        $documents = Document::with(['client', 'lawyer'])
            ->where('batch_token', $batchToken)
            ->get();

        abort_if($documents->isEmpty(), 404, 'Lote não encontrado.');

        $first = $documents->first();

        // Verifica expiração
        $pendingDocs = $documents->filter(fn ($d) => $d->isPending());

        foreach ($documents as $doc) {
            if ($doc->isExpired()) {
                $doc->update(['status' => 'expired']);
            }
        }

        // Recarrega após possível atualização de expirados
        $documents = Document::with(['client', 'lawyer'])
            ->where('batch_token', $batchToken)
            ->get();

        $pendingDocs = $documents->filter(fn ($d) => $d->isPending());

        abort_if($pendingDocs->isEmpty(), 422, 'Nenhum documento disponível para assinatura neste lote.');

        return response()->json([
            'data' => [
                'batch_token' => $batchToken,
                'documents'   => $pendingDocs->values()->map(fn ($doc) => [
                    'id'          => $doc->id,
                    'title'       => $doc->title,
                    'status'      => $doc->status,
                    'signing_token' => $doc->signing_token,
                ]),
                'total_documents' => $documents->count(),
                'pending_documents' => $pendingDocs->count(),
                'client' => [
                    'name'  => $first->client->name,
                    'cpf'   => $first->client->cpf,
                    'email' => $first->client->email,
                ],
                'document' => [
                    'lawyer_name' => $first->lawyer->name,
                    'oab_number'  => $first->lawyer->oab_number,
                    'expires_at'  => $first->expires_at,
                ],
            ],
        ]);
    }

    /**
     * Retorna o PDF de um documento específico do lote.
     */
    public function batchPdf(string $batchToken, int $documentId): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        $document = Document::where('batch_token', $batchToken)
            ->where('id', $documentId)
            ->firstOrFail();

        abort_if(! $document->isPending(), 422, 'Documento não disponível.');

        return Storage::response($document->original_file_path, $document->title . '.pdf', [
            'Content-Type' => 'application/pdf',
        ]);
    }

    /**
     * Assina todos os documentos pendentes do lote de uma só vez.
     */
    public function storeBatch(Request $request, string $batchToken): JsonResponse
    {
        $documents = Document::with('client')
            ->where('batch_token', $batchToken)
            ->get();

        abort_if($documents->isEmpty(), 404, 'Lote não encontrado.');

        $pendingDocs = $documents->filter(function ($doc) {
            if ($doc->isExpired()) {
                $doc->update(['status' => 'expired']);
                return false;
            }
            return $doc->isPending();
        });

        abort_if($pendingDocs->isEmpty(), 422, 'Nenhum documento disponível para assinatura neste lote.');

        $request->validate([
            'accepted_terms' => ['required', 'accepted'],
            'selfie'         => ['required', 'file', 'mimes:jpg,jpeg,png,webp', 'max:10240'],
            'signature'      => ['required', 'file', 'mimes:png,jpg,jpeg,webp', 'max:5120'],
            'latitude'       => ['required', 'numeric', 'between:-90,90'],
            'longitude'      => ['required', 'numeric', 'between:-180,180'],
            'timezone'       => ['nullable', 'string', 'max:50'],
        ]);

        $firstDoc = $pendingDocs->first();

        // Armazena evidências uma única vez (compartilhadas entre todos os docs)
        $selfiePath = $request->file('selfie')->store(
            "signatures/batch_{$batchToken}/selfies",
            'local',
        );

        $signaturePath = $request->file('signature')->store(
            "signatures/batch_{$batchToken}/signatures",
            'local',
        );

        // Assina todos os documentos pendentes do lote
        foreach ($pendingDocs as $document) {
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
                'signature_path' => $signaturePath,
                'signature_type' => 'electronic',
                'document_hash'  => $documentHash,
                'signed_at'      => now(),
            ]);

            $document->update([
                'status'           => 'client_signed',
                'client_signed_at' => now(),
            ]);

            ActivityService::log(
                action:      'client_signed',
                description: "{$document->client->name} assinou eletronicamente o documento \"{$document->title}\" (lote) (IP: {$request->ip()})",
                user:        null,
                subject:     $document,
                metadata:    [
                    'client_name'  => $document->client->name,
                    'client_email' => $document->client->email,
                    'ip'           => $request->ip(),
                    'batch_token'  => $batchToken,
                ],
            );
        }

        // Notifica o advogado (uma vez, referenciando o primeiro doc do lote)
        $firstDoc->lawyer->notify(new \App\Notifications\ClientSignedDocument($firstDoc));

        // Assinatura automática com Certificado A1 da equipe
        $certificate = User::teamActiveCertificate();

        if ($certificate) {
            $lawyer = $firstDoc->lawyer;
            foreach ($pendingDocs as $document) {
                $document->update(['status' => 'processing']);

                ApplyAdvogadoSignature::dispatch($document, $certificate, $lawyer)
                    ->onQueue('signatures');
            }

            Log::info('Assinatura automática do advogado disparada para lote', [
                'batch_token'    => $batchToken,
                'document_count' => $pendingDocs->count(),
                'certificate_id' => $certificate->id,
            ]);
        }

        return response()->json([
            'message' => $pendingDocs->count() . ' documento(s) assinado(s) com sucesso! A assinatura digital do advogado será aplicada automaticamente.',
        ]);
    }
}
