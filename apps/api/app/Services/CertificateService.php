<?php

namespace App\Services;

use App\Models\Certificate;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

class CertificateService
{
    /**
     * Faz o upload, valida e persiste o Certificado A1.
     *
     * @throws RuntimeException se o certificado for inválido ou a senha incorreta
     */
    public function store(User $user, UploadedFile $pfxFile, string $password): Certificate
    {
        // 1. Lê o conteúdo binário do .pfx
        $pfxContent = file_get_contents($pfxFile->getRealPath());

        // 2. Tenta abrir o certificado com a senha fornecida
        $certData = $this->readPkcs12($pfxContent, $password);

        // 3. Extrai metadados do certificado X.509
        $x509Details = openssl_x509_parse($certData['cert']);

        if (! $x509Details) {
            throw new RuntimeException('Não foi possível ler os dados do certificado X.509.');
        }

        $validFrom  = isset($x509Details['validFrom_time_t'])
            ? \Carbon\Carbon::createFromTimestamp($x509Details['validFrom_time_t'])
            : null;

        $validUntil = isset($x509Details['validTo_time_t'])
            ? \Carbon\Carbon::createFromTimestamp($x509Details['validTo_time_t'])
            : null;

        // Extrai o CPF/CNPJ do campo subject (padrão ICP-Brasil: OID 2.16.76.1.3.1)
        $cpfCnpj = $this->extractCpfFromCertificate($x509Details);

        // 4. Armazena o arquivo .pfx em disco PRIVADO (fora do public/)
        $filename = "certificates/{$user->id}/" . now()->format('YmdHis') . '_' . uniqid() . '.pfx';
        Storage::disk('local')->put($filename, $pfxContent);

        // 5. Desativa certificados anteriores de toda a equipe
        Certificate::whereIn('user_id', User::teamUserIds())->active()->update(['is_active' => false]);

        // 6. Persiste no banco com senha criptografada
        return Certificate::create([
            'user_id'            => $user->id,
            'file_path'          => $filename,
            'password_encrypted' => Crypt::encryptString($password),
            'issuer'             => $x509Details['issuer']['CN'] ?? ($x509Details['issuer']['O'] ?? null),
            'subject'            => $x509Details['subject']['CN'] ?? null,
            'serial_number'      => $x509Details['serialNumberHex'] ?? null,
            'cpf_cnpj'           => $cpfCnpj,
            'valid_from'         => $validFrom,
            'valid_until'        => $validUntil,
            'is_active'          => true,
        ]);
    }

    /**
     * Carrega o certificado e retorna os dados para uso na assinatura.
     * Nunca persiste a senha descriptografada; apenas retorna em memória.
     */
    public function loadForSigning(Certificate $certificate): array
    {
        $pfxContent = Storage::disk('local')->get($certificate->file_path);

        if (! $pfxContent) {
            throw new RuntimeException('Arquivo do certificado não encontrado no storage.');
        }

        $password = Crypt::decryptString($certificate->password_encrypted);

        return $this->readPkcs12($pfxContent, $password);
    }

    /**
     * Lê um arquivo PKCS12 (.pfx/.p12) com suporte a certificados ICP-Brasil
     * que usam algoritmos legados (RC2, 3DES) incompatíveis com OpenSSL 3.x.
     *
     * Tenta primeiro via extensão PHP; se falhar, usa o CLI openssl com -legacy.
     */
    private function readPkcs12(string $pfxContent, string $password): array
    {
        // Tentativa 1: extensão PHP (funciona para certificados modernos)
        $certData = [];
        if (openssl_pkcs12_read($pfxContent, $certData, $password)) {
            return $certData;
        }

        // Tentativa 2: CLI openssl com -legacy (certificados ICP-Brasil)
        $tmpPfx = tempnam(sys_get_temp_dir(), 'pfx_');
        $tmpPem = tempnam(sys_get_temp_dir(), 'pem_');

        try {
            file_put_contents($tmpPfx, $pfxContent);
            chmod($tmpPfx, 0600);

            $escapedPass = escapeshellarg($password);

            // Extrai cert + key em PEM usando -legacy
            $cmd = sprintf(
                'openssl pkcs12 -in %s -out %s -nodes -passin pass:%s -legacy 2>&1',
                escapeshellarg($tmpPfx),
                escapeshellarg($tmpPem),
                $escapedPass,
            );

            exec($cmd, $output, $exitCode);

            if ($exitCode !== 0) {
                throw new RuntimeException(
                    'Não foi possível abrir o certificado. Verifique se a senha está correta e se o arquivo é um .pfx/.p12 válido.'
                );
            }

            $pemContent = file_get_contents($tmpPem);

            // Extrai certificado e chave privada do PEM
            $cert = $pkey = null;

            if (preg_match('/-----BEGIN CERTIFICATE-----.*?-----END CERTIFICATE-----/s', $pemContent, $m)) {
                $cert = $m[0];
            }
            if (preg_match('/-----BEGIN PRIVATE KEY-----.*?-----END PRIVATE KEY-----/s', $pemContent, $m)) {
                $pkey = $m[0];
            }

            if (! $cert || ! $pkey) {
                throw new RuntimeException(
                    'Não foi possível extrair o certificado e a chave privada do arquivo .pfx/.p12.'
                );
            }

            return ['cert' => $cert, 'pkey' => $pkey];
        } finally {
            @unlink($tmpPfx);
            @unlink($tmpPem);
        }
    }

    /**
     * Extrai CPF/CNPJ do subject do certificado ICP-Brasil.
     * O padrão ICP-Brasil codifica o CPF no campo "serialNumber" do subject.
     */
    private function extractCpfFromCertificate(array $x509Details): ?string
    {
        // Tenta extrair do campo serialNumber (padrão mais comum)
        $serialNumber = $x509Details['subject']['serialNumber'] ?? null;

        if ($serialNumber) {
            // Formato típico ICP-Brasil: "CPF:00000000000" ou apenas "00000000000"
            $cleaned = preg_replace('/\D/', '', $serialNumber);
            if (strlen($cleaned) === 11 || strlen($cleaned) === 14) {
                return $cleaned;
            }
        }

        return null;
    }
}
