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
        $certData = [];
        $opened   = openssl_pkcs12_read($pfxContent, $certData, $password);

        if (! $opened) {
            throw new RuntimeException('Não foi possível abrir o certificado. Verifique se a senha está correta e se o arquivo é um .pfx/.p12 válido.');
        }

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

        // 5. Desativa certificados anteriores do usuário
        $user->certificates()->active()->update(['is_active' => false]);

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
        $certData = [];

        if (! openssl_pkcs12_read($pfxContent, $certData, $password)) {
            throw new RuntimeException('Falha ao abrir o certificado A1. O arquivo pode ter sido corrompido.');
        }

        return $certData; // ['cert' => '...', 'pkey' => '...', 'extracerts' => [...]]
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
