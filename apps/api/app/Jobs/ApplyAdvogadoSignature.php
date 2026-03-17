<?php

namespace App\Jobs;

use App\Models\Certificate;
use App\Models\Document;
use App\Models\Signature;
use App\Models\User;
use App\Notifications\DocumentCompleted;
use App\Services\ActivityService;
use App\Services\PdfSignerService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;
use Throwable;

class ApplyAdvogadoSignature implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries   = 2;
    public int $timeout = 120; // 2 minutos (assinatura pode ser lenta)

    public function __construct(
        public readonly Document    $document,
        public readonly Certificate $certificate,
        public readonly User        $lawyer,
    ) {
    }

    public function handle(PdfSignerService $signerService): void
    {
        $document    = $this->document->fresh(['client', 'lawyer', 'clientSignature']);
        $certificate = $this->certificate->fresh();

        // Hash do documento mesclado no momento da assinatura do advogado
        $documentHash = hash_file('sha256', Storage::disk('local')->path($document->original_file_path));

        // 1. Assina o PDF (gera manifesto + funde + aplica PAdES)
        $signedPath = $signerService->sign($document, $certificate);

        // 2. Calcula hash SHA-256 do PDF final assinado
        $finalHash = hash_file('sha256', Storage::disk('local')->path($signedPath));

        // 3. Registra a assinatura do advogado
        Signature::create([
            'document_id'    => $document->id,
            'signer_type'    => 'lawyer',
            'signer_id'      => $this->lawyer->id,
            'signer_name'    => $this->lawyer->name,
            'signer_email'   => $this->lawyer->email,
            'ip_address'     => null, // server-side, sem IP de origem
            'signature_type' => 'digital_icp',
            'certificate_id' => $certificate->id,
            'document_hash'  => $documentHash,
            'signed_at'      => now(),
        ]);

        // 4. Atualiza o documento como concluído
        $document->update([
            'status'           => 'completed',
            'signed_file_path' => $signedPath,
            'final_hash'       => $finalHash,
            'completed_at'     => now(),
        ]);

        ActivityService::log(
            action:      'document_completed',
            description: "{$this->lawyer->name} assinou digitalmente (ICP-Brasil) o documento \"{$document->title}\" — processo concluído",
            user:        $this->lawyer,
            subject:     $document,
            metadata:    ['certificate_id' => $certificate->id, 'final_hash' => $finalHash],
        );

        // 5. Notifica ambas as partes
        $document->lawyer->notify(new DocumentCompleted($document, 'lawyer'));

        // Notifica o cliente diretamente via Mail (sem necessidade de conta)
        \Illuminate\Support\Facades\Mail::send(
            'emails.document-completed-client',
            [
                'clientName'    => $document->client->name,
                'documentTitle' => $document->title,
                'finalHash'     => $finalHash,
                'downloadUrl'   => config('app.frontend_url') . '/sign/' . $document->signing_token . '/completed',
            ],
            fn ($message) => $message
                ->to($document->client->email, $document->client->name)
                ->subject("✅ Documento assinado: {$document->title}"),
        );
    }

    public function failed(Throwable $exception): void
    {
        // Reverte o status para client_signed em caso de falha
        $this->document->update(['status' => 'client_signed']);

        \Illuminate\Support\Facades\Log::error('Falha ao aplicar assinatura do advogado', [
            'document_id' => $this->document->id,
            'error'       => $exception->getMessage(),
        ]);
    }
}
