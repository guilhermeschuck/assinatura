<?php

namespace App\Jobs;

use App\Models\Document;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Mail;

class SendBatchSigningLink implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries   = 3;
    public int $backoff = 60;

    public function __construct(
        public readonly Document $document,
        public readonly string   $batchToken,
    ) {
    }

    public function handle(): void
    {
        $documents = Document::with(['client', 'lawyer'])
            ->where('batch_token', $this->batchToken)
            ->get();

        if ($documents->isEmpty()) {
            return;
        }

        $first     = $documents->first();
        $client    = $first->client;
        $lawyer    = $first->lawyer;
        $signingUrl = config('app.frontend_url') . '/sign/batch/' . $this->batchToken;

        Mail::send(
            'emails.batch-signing-link',
            [
                'clientName'     => $client->name,
                'lawyerName'     => $lawyer->name,
                'oabNumber'      => $lawyer->oab_number,
                'documents'      => $documents->map(fn ($d) => $d->title)->toArray(),
                'documentCount'  => $documents->count(),
                'signingUrl'     => $signingUrl,
                'expiresAt'      => $first->expires_at?->format('d/m/Y \à\s H:i'),
            ],
            fn ($message) => $message
                ->to($client->email, $client->name)
                ->subject("{$documents->count()} documentos para assinatura — " . $lawyer->name),
        );
    }
}
