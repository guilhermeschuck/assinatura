<?php

namespace App\Notifications;

use App\Models\Document;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class DocumentCompleted extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly Document $document,
        public readonly string   $recipientType, // 'client' | 'lawyer'
    ) {
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $downloadUrl = config('app.frontend_url') . '/documents/' . $this->document->id . '/download-public/' . $this->document->signing_token;

        $message = (new MailMessage)
            ->subject("📄 Documento concluído: {$this->document->title}");

        if ($this->recipientType === 'client') {
            $message
                ->greeting("Olá, {$this->document->client->name}!")
                ->line("O documento **{$this->document->title}** foi assinado por todas as partes e está disponível para download.")
                ->line('Este documento tem validade jurídica conforme a Lei 14.063/2020 e a MP 2.200-2/2001 (ICP-Brasil).');
        } else {
            $message
                ->greeting("Olá, {$notifiable->name}!")
                ->line("O documento **{$this->document->title}** foi assinado por você com Certificado A1 e está disponível para download.");
        }

        return $message
            ->action('Baixar Documento Assinado', $downloadUrl)
            ->line("Hash SHA-256: `{$this->document->final_hash}`")
            ->line('Guarde este código para verificar a integridade do documento a qualquer momento.');
    }

    public function toArray(object $notifiable): array
    {
        return [
            'document_id' => $this->document->id,
            'final_hash'  => $this->document->final_hash,
            'type'        => 'document_completed',
        ];
    }
}
