<?php

namespace App\Http\Controllers;

use App\Models\Certificate;
use App\Models\User;
use App\Services\CertificateService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

class CertificateController extends Controller
{
    public function __construct(private readonly CertificateService $certificateService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $certificates = Certificate::whereIn('user_id', User::teamUserIds())
            ->select(['id', 'issuer', 'subject', 'serial_number', 'valid_from', 'valid_until', 'is_active', 'created_at'])
            ->latest()
            ->get();

        return response()->json(['data' => $certificates]);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'pfx_file' => ['required', 'file', 'max:5120', function (string $attribute, mixed $value, \Closure $fail) {
                $ext = strtolower($value->getClientOriginalExtension());
                if (! in_array($ext, ['pfx', 'p12'])) {
                    $fail('O certificado deve ser um arquivo .pfx ou .p12.');
                }
            }], // 5 MB
            'password' => ['required', 'string', 'min:1'],
        ]);

        try {
            $certificate = $this->certificateService->store(
                $request->user(),
                $request->file('pfx_file'),
                $request->password,
            );

            // Remove informações sensíveis da resposta
            $certificate->makeHidden(['file_path', 'password_encrypted']);

            return response()->json(['data' => $certificate, 'message' => 'Certificado configurado com sucesso!'], 201);
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function destroy(Request $request, Certificate $certificate): JsonResponse
    {
        abort_if(! in_array($certificate->user_id, User::teamUserIds()), 403);

        $certificate->update(['is_active' => false]);

        return response()->json(['message' => 'Certificado desativado.']);
    }
}
