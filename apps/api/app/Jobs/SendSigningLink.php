<?php

namespace App\Jobs;

use App\Models\Document;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Mail;

class SendSigningLink implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries   = 3;
    public int $backoff = 60;

    public function __construct(public readonly Document $document)
    {
    }

    public function handle(): void
    {
        $document = $this->document->fresh(['client', 'lawyer']);

        Mail::send(
            'emails.signing-link',
            [
                'clientName'    => $document->client->name,
                'lawyerName'    => $document->lawyer->name,
                'oabNumber'     => $document->lawyer->oab_number,
                'documentTitle' => $document->title,
                'signingUrl'    => $document->signing_url,
                'expiresAt'     => $document->expires_at?->format('d/m/Y \à\s H:i'),
            ],
            fn ($message) => $message
                ->to($document->client->email, $document->client->name)
                ->subject("Documento para assinatura: {$document->title}"),
        );
    }
}
