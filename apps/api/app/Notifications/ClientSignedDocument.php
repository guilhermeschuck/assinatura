<?php

namespace App\Notifications;

use App\Models\Document;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ClientSignedDocument extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public readonly Document $document)
    {
    }

    public function via(object $notifiable): array
    {
        return ['mail', 'database'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $dashboardUrl = config('app.frontend_url') . '/documents/' . $this->document->id;

        return (new MailMessage)
            ->subject("✅ Cliente assinou: {$this->document->title}")
            ->greeting("Olá, {$notifiable->name}!")
            ->line("Seu cliente **{$this->document->client->name}** assinou o documento **{$this->document->title}**.")
            ->line('Agora é a sua vez de assinar digitalmente com seu Certificado A1.')
            ->action('Assinar com Certificado A1', $dashboardUrl)
            ->line('Após a sua assinatura, ambas as partes receberão o documento final por e-mail.');
    }

    public function toArray(object $notifiable): array
    {
        return [
            'document_id'    => $this->document->id,
            'document_title' => $this->document->title,
            'client_name'    => $this->document->client->name,
            'type'           => 'client_signed',
        ];
    }
}
