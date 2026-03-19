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
     * 3. Aplica a assinatura digital PAdES via TCPDF nativo
     * 4. Armazena no storage e retorna o caminho
     */
    public function sign(Document $document, Certificate $certificate): string
    {
        // Carrega os dados do certificado em memória
        $certData = $this->certificateService->loadForSigning($certificate);

        // 1. Gera o manifesto como PDF em memória
        $manifestPdf = $this->manifestService->generate($document);

        // 2. Funde original + manifesto e aplica assinatura PAdES em um passo
        $signedPdf = $this->mergePdfsAndSign($document, $manifestPdf, $certData);

        // 3. Armazena em disco
        $outputPath = "documents/{$document->user_id}/signed/{$document->signing_token}_signed.pdf";
        Storage::disk('local')->put($outputPath, $signedPdf);

        return $outputPath;
    }

    /**
     * Normaliza um PDF para que o FPDI gratuito consiga processá-lo.
     * Remove cross-reference streams e compressão avançada (PDF 1.5+).
     */
    private function normalizePdf(string $inputPath): string
    {
        $outputPath = tempnam(sys_get_temp_dir(), 'qpdf_') . '.pdf';

        $cmd = sprintf(
            'qpdf --decode-level=generalized --object-streams=disable %s %s 2>&1',
            escapeshellarg($inputPath),
            escapeshellarg($outputPath),
        );

        exec($cmd, $output, $exitCode);

        // qpdf retorna 0 (ok) ou 3 (warnings mas arquivo gerado)
        if ($exitCode !== 0 && $exitCode !== 3) {
            @unlink($outputPath);
            throw new RuntimeException('Falha ao normalizar PDF: ' . implode(' ', $output));
        }

        return $outputPath;
    }

    /**
     * Funde o PDF original com a página de manifesto e aplica
     * a assinatura digital PAdES usando o suporte nativo do TCPDF.
     */
    private function mergePdfsAndSign(Document $document, string $manifestPdfContent, array $certData): string
    {
        $originalPath    = Storage::disk('local')->path($document->original_file_path);
        $manifestTmpPath = tempnam(sys_get_temp_dir(), 'manifest_') . '.pdf';
        file_put_contents($manifestTmpPath, $manifestPdfContent);

        // Normaliza os PDFs para compatibilidade com FPDI gratuito
        $normalizedOriginal = $this->normalizePdf($originalPath);
        $normalizedManifest = $this->normalizePdf($manifestTmpPath);

        // Escreve cert/key em arquivos temporários para o TCPDF
        $tmpCert   = tempnam(sys_get_temp_dir(), 'cert_') . '.pem';
        $tmpKey    = tempnam(sys_get_temp_dir(), 'key_') . '.pem';
        $tmpExtras = null;

        file_put_contents($tmpCert, $certData['cert']);
        chmod($tmpCert, 0600);
        file_put_contents($tmpKey, $certData['pkey']);
        chmod($tmpKey, 0600);

        if (! empty($certData['extracerts'])) {
            $tmpExtras = tempnam(sys_get_temp_dir(), 'extras_') . '.pem';
            $extraContent = is_array($certData['extracerts'])
                ? implode("\n", $certData['extracerts'])
                : $certData['extracerts'];
            file_put_contents($tmpExtras, $extraContent);
            chmod($tmpExtras, 0600);
        }

        $verifyUrl  = config('app.frontend_url') . '/verify/' . $document->signing_token;
        $lawyerName = $document->lawyer->name ?? '';
        $signedAt   = now()->format('d/m/Y H:i');

        try {
            $pdf = new Fpdi('P', 'mm', 'A4');
            $pdf->setPrintHeader(false);
            $pdf->setPrintFooter(false);
            $pdf->SetAutoPageBreak(false);

            // Importa todas as páginas do documento original com carimbo
            $pageCount = $pdf->setSourceFile($normalizedOriginal);
            for ($i = 1; $i <= $pageCount; $i++) {
                $templateId = $pdf->importPage($i);
                $size       = $pdf->getTemplateSize($templateId);
                $orientation = $size['width'] > $size['height'] ? 'L' : 'P';

                $pdf->AddPage($orientation, [$size['width'], $size['height']]);
                $pdf->useTemplate($templateId);

                // Carimbo de assinatura digital no rodapé de cada página
                $this->addStamp($pdf, $size, $lawyerName, $signedAt, $verifyUrl, $i, $pageCount);
            }

            // Importa a página do manifesto (sem carimbo)
            $manifestPageCount = $pdf->setSourceFile($normalizedManifest);
            for ($i = 1; $i <= $manifestPageCount; $i++) {
                $templateId = $pdf->importPage($i);
                $size       = $pdf->getTemplateSize($templateId);
                $pdf->AddPage('P', [$size['width'], $size['height']]);
                $pdf->useTemplate($templateId);
            }

            // Aplica assinatura digital PAdES via TCPDF nativo
            $pdf->setSignature(
                'file://' . $tmpCert,
                'file://' . $tmpKey,
                '',
                $tmpExtras ? ('file://' . $tmpExtras) : '',
                2,
                [
                    'Name'        => $lawyerName,
                    'Location'    => 'Brasil',
                    'Reason'      => 'Assinatura Digital ICP-Brasil',
                    'ContactInfo' => $document->lawyer->email ?? '',
                ],
            );

            return $pdf->Output('', 'S');
        } finally {
            @unlink($manifestTmpPath);
            @unlink($normalizedOriginal);
            @unlink($normalizedManifest);
            @unlink($tmpCert);
            @unlink($tmpKey);
            if ($tmpExtras) {
                @unlink($tmpExtras);
            }
        }
    }

    /**
     * Adiciona carimbo discreto de assinatura digital no rodapé da página.
     */
    private function addStamp(Fpdi $pdf, array $size, string $lawyerName, string $signedAt, string $verifyUrl, int $page, int $totalPages): void
    {
        $pageWidth  = $size['width'];
        $pageHeight = $size['height'];

        $stampH = 12;
        $stampY = $pageHeight - $stampH - 3;
        $stampX = 10;
        $stampW = $pageWidth - 20;

        // Fundo escuro
        $pdf->SetAlpha(0.85);
        $pdf->SetFillColor(27, 46, 75); // #1B2E4B
        $pdf->RoundedRect($stampX, $stampY, $stampW, $stampH, 1.5, '1111', 'F');
        $pdf->SetAlpha(1);

        // Título
        $pdf->SetFont('helvetica', 'B', 6.5);
        $pdf->SetTextColor(255, 255, 255);
        $pdf->SetXY($stampX + 4, $stampY + 1.2);
        $pdf->Cell(60, 4, 'DOCUMENTO ASSINADO DIGITALMENTE', 0, 0, 'L');

        // Detalhes
        $pdf->SetFont('helvetica', '', 5.5);
        $pdf->SetTextColor(200, 210, 220);
        $pdf->SetXY($stampX + 4, $stampY + 5);
        $details = "Assinado por: {$lawyerName} | Data: {$signedAt} | Pg {$page}/{$totalPages}";
        $pdf->Cell($stampW - 10, 3.5, $details, 0, 0, 'L');

        // Link de verificação
        $pdf->SetFont('helvetica', '', 5);
        $pdf->SetTextColor(160, 200, 160);
        $pdf->SetXY($stampX + 4, $stampY + 8.2);
        $pdf->Cell($stampW - 10, 3, "Verifique: {$verifyUrl}", 0, 0, 'L', false, $verifyUrl);

        // Badge ICP-Brasil
        $pdf->SetFont('helvetica', 'B', 5);
        $pdf->SetTextColor(201, 168, 76); // dourado
        $pdf->SetXY($stampX + $stampW - 32, $stampY + 2);
        $pdf->Cell(28, 3, 'ICP-BRASIL', 0, 0, 'R');
        $pdf->SetFont('helvetica', '', 4.5);
        $pdf->SetTextColor(200, 210, 220);
        $pdf->SetXY($stampX + $stampW - 32, $stampY + 5.5);
        $pdf->Cell(28, 3, 'Lei 14.063/2020', 0, 0, 'R');

        // Reset
        $pdf->SetTextColor(0, 0, 0);
    }
}
