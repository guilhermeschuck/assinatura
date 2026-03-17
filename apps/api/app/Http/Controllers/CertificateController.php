<?php

namespace App\Http\Controllers;

use App\Models\Certificate;
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
        $certificates = $request->user()
            ->certificates()
            ->select(['id', 'issuer', 'subject', 'serial_number', 'valid_from', 'valid_until', 'is_active', 'created_at'])
            ->latest()
            ->get();

        return response()->json(['data' => $certificates]);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'pfx_file' => ['required', 'file', 'mimes:pfx,p12', 'max:5120'], // 5 MB
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
        abort_if($certificate->user_id !== $request->user()->id, 403);

        $certificate->update(['is_active' => false]);

        return response()->json(['message' => 'Certificado desativado.']);
    }
}
