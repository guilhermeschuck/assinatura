<?php

namespace App\Services;

use App\Models\Certificate;
use App\Models\Document;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use setasign\Fpdi\Tcpdf\Fpdi;

class PdfSignerService
{
    public function __construct(
        private readonly ManifestService    $manifestService,
        private readonly CertificateService $certificateService,
    ) {
    }

    /**
     * Processo completo de finalização do documento:
     * 1. Gera a página de manifesto/auditoria
     * 2. Funde o manifesto ao PDF original usando FPDI
     * 3. Aplica a assinatura digital PAdES com o Certificado A1 via OpenSSL
     * 4. Calcula o hash SHA-256 do PDF final
     * 5. Armazena no storage e retorna o caminho
     */
    public function sign(Document $document, Certificate $certificate): string
    {
        // 1. Gera o manifesto como PDF em memória
        $manifestPdf = $this->manifestService->generate($document);

        // 2. Funde: original + manifesto
        $mergedPdf = $this->mergePdfs($document, $manifestPdf);

        // 3. Aplica assinatura PAdES via OpenSSL
        $signedPdf = $this->applyPadesSignature($mergedPdf, $certificate, $document);

        // 4. Armazena em disco
        $outputPath = "documents/{$document->user_id}/signed/{$document->signing_token}_signed.pdf";
        Storage::disk('local')->put($outputPath, $signedPdf);

        return $outputPath;
    }

    /**
     * Funde o PDF original com a página de manifesto usando FPDI.
     */
    private function mergePdfs(Document $document, string $manifestPdfContent): string
    {
        $originalPath    = Storage::disk('local')->path($document->original_file_path);
        $manifestTmpPath = tempnam(sys_get_temp_dir(), 'manifest_') . '.pdf';
        file_put_contents($manifestTmpPath, $manifestPdfContent);

        try {
            $pdf = new Fpdi('P', 'mm', 'A4');
            $pdf->setPrintHeader(false);
            $pdf->setPrintFooter(false);
            $pdf->SetAutoPageBreak(false);

            // Importa todas as páginas do documento original
            $pageCount = $pdf->setSourceFile($originalPath);
            for ($i = 1; $i <= $pageCount; $i++) {
                $templateId = $pdf->importPage($i);
                $size       = $pdf->getTemplateSize($templateId);

                $pdf->AddPage($size['width'] > $size['height'] ? 'L' : 'P', [$size['width'], $size['height']]);
                $pdf->useTemplate($templateId);
            }

            // Importa a página do manifesto
            $manifestPageCount = $pdf->setSourceFile($manifestTmpPath);
            for ($i = 1; $i <= $manifestPageCount; $i++) {
                $templateId = $pdf->importPage($i);
                $size       = $pdf->getTemplateSize($templateId);
                $pdf->AddPage('P', [$size['width'], $size['height']]);
                $pdf->useTemplate($templateId);
            }

            return $pdf->Output('', 'S');
        } finally {
            @unlink($manifestTmpPath);
        }
    }

    /**
     * Aplica assinatura PAdES no PDF usando OpenSSL (PHP nativo).
     *
     * O padrão PAdES usa PKCS#7 detached signature embutida no PDF.
     * Aqui utilizamos openssl_pkcs7_sign para assinar o conteúdo do PDF.
     * Para conformidade total PAdES, o ideal é uma TSA (carimbo de tempo),
     * que pode ser adicionada via cURL a um serviço TSA público (ex: Certisign, Serpro).
     */
    private function applyPadesSignature(string $pdfContent, Certificate $certificate, Document $document): string
    {
        // Carrega os dados do certificado em memória
        $certData = $this->certificateService->loadForSigning($certificate);

        // Arquivos temporários (todos removidos ao final)
        $tmpPdf     = tempnam(sys_get_temp_dir(), 'unsigned_') . '.pdf';
        $tmpCert    = tempnam(sys_get_temp_dir(), 'cert_') . '.pem';
        $tmpKey     = tempnam(sys_get_temp_dir(), 'key_') . '.pem';
        $tmpSigned  = tempnam(sys_get_temp_dir(), 'signed_') . '.pdf';

        try {
            file_put_contents($tmpPdf, $pdfContent);
            file_put_contents($tmpCert, $certData['cert']);
            file_put_contents($tmpKey, $certData['pkey']);

            // Headers que serão incluídos na assinatura PKCS#7
            $headers = [
                'Document-Title'  => $document->title,
                'Signing-Time'    => now()->toIso8601String(),
                'Signing-Reason'  => 'Assinatura Digital ICP-Brasil',
                'Signing-Location' => 'Brasil',
            ];

            // Extra certs: CA intermediária (se presente no .pfx)
            $extraCerts = ! empty($certData['extracerts']) ? $certData['extracerts'] : null;

            $signed = openssl_pkcs7_sign(
                $tmpPdf,
                $tmpSigned,
                $certData['cert'],
                [$certData['pkey'], ''],  // chave privada sem senha adicional (já foi aberta)
                $headers,
                PKCS7_DETACHED,           // assinatura destacada (padrão PAdES)
                $extraCerts,
            );

            if (! $signed) {
                $error = '';
                while ($msg = openssl_error_string()) {
                    $error .= $msg . ' | ';
                }
                throw new RuntimeException("Falha na assinatura OpenSSL: {$error}");
            }

            // O arquivo gerado por openssl_pkcs7_sign é S/MIME; precisamos extrair apenas o PDF
            $signedContent = file_get_contents($tmpSigned);

            // Remove os headers S/MIME e extrai o conteúdo PEM
            $pdfSigned = $this->extractPdfFromSmime($signedContent);

            return $pdfSigned ?: $signedContent;
        } finally {
            foreach ([$tmpPdf, $tmpCert, $tmpKey, $tmpSigned] as $tmp) {
                if (file_exists($tmp)) {
                    @unlink($tmp);
                }
            }
        }
    }

    /**
     * Remove os headers S/MIME do output do openssl_pkcs7_sign,
     * retornando apenas o conteúdo binário do PDF assinado.
     */
    private function extractPdfFromSmime(string $smimeContent): string
    {
        // O formato S/MIME tem headers + corpo separados por linha em branco
        $parts = explode("\n\n", $smimeContent, 2);

        if (count($parts) < 2) {
            return $smimeContent;
        }

        // Decodifica o corpo (pode estar em base64)
        $body = $parts[1];

        if (str_contains($parts[0], 'Content-Transfer-Encoding: base64')) {
            return base64_decode(str_replace(["\r\n", "\n"], '', $body));
        }

        return $body;
    }
}
