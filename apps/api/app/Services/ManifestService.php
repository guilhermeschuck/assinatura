<?php

namespace App\Services;

use App\Models\Document;
use App\Models\Signature;
use Illuminate\Support\Facades\Storage;
use TCPDF;

class ManifestService
{
    /**
     * Gera a página de manifesto/auditoria como PDF em memória.
     * Retorna o conteúdo binário do PDF pronto para ser fundido ao documento original.
     */
    public function generate(Document $document): string
    {
        $document->load(['client', 'lawyer', 'clientSignature', 'lawyerSignature.certificate']);

        $clientSig = $document->clientSignature;
        $lawyerSig = $document->lawyerSignature;

        $pdf = new TCPDF('P', 'mm', 'A4', true, 'UTF-8', false);
        $pdf->SetCreator('Sistema de Assinatura Jurídica');
        $pdf->SetAuthor($document->lawyer->name);
        $pdf->SetTitle('Manifesto de Assinatura — ' . $document->title);
        $pdf->SetSubject('Manifesto de Assinatura Eletrônica e Digital');

        $pdf->setPrintHeader(false);
        $pdf->setPrintFooter(false);
        $pdf->SetMargins(15, 15, 15);
        $pdf->SetAutoPageBreak(true, 20);
        $pdf->AddPage();

        $html = $this->buildHtml($document, $clientSig, $lawyerSig);
        $pdf->writeHTML($html, true, false, true, false, '');

        return $pdf->Output('', 'S'); // 'S' = retorna como string
    }

    private function buildHtml(Document $document, ?Signature $clientSig, ?Signature $lawyerSig): string
    {
        $selfieBase64 = '';
        if ($clientSig?->selfie_path && Storage::disk('local')->exists($clientSig->selfie_path)) {
            $selfieContent = Storage::disk('local')->get($clientSig->selfie_path);
            $mime          = Storage::disk('local')->mimeType($clientSig->selfie_path);
            $selfieBase64  = "data:{$mime};base64," . base64_encode($selfieContent);
        }

        $now = now()->format('d/m/Y H:i:s T');

        $html = <<<HTML
        <style>
            body { font-family: helvetica; font-size: 9pt; color: #1A1A2E; }
            h1 { font-size: 13pt; color: #1B2E4B; text-align: center; border-bottom: 2px solid #C9A84C; padding-bottom: 6px; margin-bottom: 12px; }
            h2 { font-size: 10pt; color: #1B2E4B; background: #F0EDE8; padding: 5px 8px; margin: 12px 0 6px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
            td { padding: 4px 6px; font-size: 8.5pt; vertical-align: top; border-bottom: 1px solid #E2DDD5; }
            td.label { color: #6B7280; width: 35%; font-weight: bold; }
            .hash { font-family: courier; font-size: 7pt; color: #374151; background: #F9FAFB; padding: 3px 6px; word-break: break-all; }
            .selfie-container { text-align: center; margin: 8px 0; }
            .selfie-container img { max-width: 180px; max-height: 180px; border: 2px solid #C9A84C; border-radius: 4px; }
            .footer-note { font-size: 7.5pt; color: #6B7280; text-align: center; border-top: 1px solid #E2DDD5; padding-top: 8px; margin-top: 12px; }
            .validity-badge { background: #D1FAE5; color: #065F46; border: 1px solid #6EE7B7; padding: 3px 8px; font-size: 8pt; border-radius: 3px; display: inline-block; }
        </style>

        <h1>MANIFESTO DE ASSINATURA ELETRÔNICA E DIGITAL</h1>

        <h2>📄 DOCUMENTO</h2>
        <table>
            <tr><td class="label">Título</td><td>{$document->title}</td></tr>
            <tr><td class="label">Hash SHA-256 (original)</td><td class="hash">{$document->original_hash}</td></tr>
            <tr><td class="label">Hash SHA-256 (final)</td><td class="hash">{$document->final_hash}</td></tr>
            <tr><td class="label">Gerado em</td><td>{$now}</td></tr>
        </table>

        HTML;

        // Bloco do cliente
        if ($clientSig) {
            $signedAt = $clientSig->signed_at?->format('d/m/Y H:i:s');
            $geo      = $clientSig->latitude && $clientSig->longitude
                ? "{$clientSig->latitude}, {$clientSig->longitude}"
                : 'Não informada';

            $html .= <<<HTML
            <h2>🖊 ASSINATURA ELETRÔNICA — CLIENTE</h2>
            <table>
                <tr><td class="label">Nome</td><td>{$clientSig->signer_name}</td></tr>
                <tr><td class="label">CPF</td><td>{$clientSig->signer_cpf}</td></tr>
                <tr><td class="label">E-mail</td><td>{$clientSig->signer_email}</td></tr>
                <tr><td class="label">Endereço IP</td><td>{$clientSig->ip_address}</td></tr>
                <tr><td class="label">Geolocalização</td><td>{$geo}</td></tr>
                <tr><td class="label">Fuso Horário</td><td>{$clientSig->timezone}</td></tr>
                <tr><td class="label">Data/Hora da Assinatura</td><td>{$signedAt} UTC</td></tr>
                <tr><td class="label">User-Agent</td><td style="font-size:7.5pt">{$clientSig->user_agent}</td></tr>
                <tr><td class="label">Hash do Documento</td><td class="hash">{$clientSig->document_hash}</td></tr>
                <tr><td class="label">Tipo</td><td><span class="validity-badge">Assinatura Eletrônica Avançada — Lei 14.063/2020</span></td></tr>
            </table>
            HTML;

            if ($selfieBase64) {
                $html .= '<div class="selfie-container"><img src="' . $selfieBase64 . '" alt="Selfie com documento de identificação"/><br><small style="font-size:7pt;color:#6B7280;">Selfie do cliente com documento de identificação (RG/CNH)</small></div>';
            }
        }

        // Bloco do advogado
        if ($lawyerSig) {
            $signedAt = $lawyerSig->signed_at?->format('d/m/Y H:i:s');
            $cert     = $lawyerSig->certificate;

            $html .= <<<HTML
            <h2>🔐 ASSINATURA DIGITAL ICP-BRASIL — ADVOGADO</h2>
            <table>
                <tr><td class="label">Nome</td><td>{$lawyerSig->signer_name}</td></tr>
                <tr><td class="label">OAB</td><td>{$document->lawyer->oab_number}</td></tr>
                <tr><td class="label">Certificado (Subject)</td><td>{$cert?->subject}</td></tr>
                <tr><td class="label">Autoridade Emissora (CA)</td><td>{$cert?->issuer}</td></tr>
                <tr><td class="label">Número de Série</td><td>{$cert?->serial_number}</td></tr>
                <tr><td class="label">Validade do Certificado</td><td>{$cert?->valid_from?->format('d/m/Y')} a {$cert?->valid_until?->format('d/m/Y')}</td></tr>
                <tr><td class="label">Data/Hora da Assinatura</td><td>{$signedAt} UTC</td></tr>
                <tr><td class="label">Padrão de Assinatura</td><td>PAdES (PDF Advanced Electronic Signatures)</td></tr>
                <tr><td class="label">Algoritmo</td><td>SHA-256 with RSA</td></tr>
                <tr><td class="label">Tipo</td><td><span class="validity-badge">Assinatura Digital Qualificada — MP 2.200-2/2001 (ICP-Brasil)</span></td></tr>
            </table>
            HTML;
        }

        $html .= <<<HTML
        <div class="footer-note">
            Este manifesto comprova a autenticidade e integridade do processo de assinatura.<br>
            Validade jurídica conforme MP 2.200-2/2001 (ICP-Brasil) e Lei 14.063/2020.<br>
            Gerado automaticamente pelo Sistema de Assinatura Jurídica.
        </div>
        HTML;

        return $html;
    }
}
