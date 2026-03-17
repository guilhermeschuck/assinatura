<?php

namespace App\Http\Controllers;

use App\Jobs\SendSigningLink;
use App\Models\Client;
use App\Models\Document;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class DocumentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Document::with(['client', 'lawyer'])
            ->where('user_id', $request->user()->id)
            ->latest();

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'ilike', "%{$search}%")
                  ->orWhereHas('client', fn ($q) => $q->where('name', 'ilike', "%{$search}%"));
            });
        }

        return response()->json($query->paginate(15));
    }

    public function show(Request $request, Document $document): JsonResponse
    {
        abort_if($document->user_id !== $request->user()->id, 403);

        $document->load(['client', 'clientSignature', 'lawyerSignature.certificate']);

        return response()->json(['data' => $document]);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'title'            => ['required', 'string', 'max:255'],
            'pdf_file'         => ['required', 'file', 'mimes:pdf', 'max:20480'],
            'expiration_days'  => ['integer', 'min:1', 'max:90'],
            'client_id'        => [
                'nullable', 'integer',
                Rule::exists('clients', 'id')->where('user_id', $request->user()->id),
            ],
            'client.name'     => ['required_without:client_id', 'string', 'max:255'],
            'client.cpf'      => ['required_without:client_id', 'string', 'max:14'],
            'client.email'    => ['required_without:client_id', 'email', 'max:255'],
            'client.whatsapp' => ['nullable', 'string', 'max:20'],
        ]);

        return DB::transaction(function () use ($request) {
            if ($request->client_id) {
                $client = Client::findOrFail($request->client_id);
            } else {
                $client = Client::create([
                    'user_id'  => $request->user()->id,
                    'name'     => $request->input('client.name'),
                    'cpf'      => $request->input('client.cpf'),
                    'email'    => $request->input('client.email'),
                    'whatsapp' => $request->input('client.whatsapp'),
                ]);
            }

            $pdfFile = $request->file('pdf_file');
            $path    = $pdfFile->store("documents/{$request->user()->id}/originals", 'local');
            $hash    = hash_file('sha256', $pdfFile->getRealPath());

            $document = Document::create([
                'user_id'            => $request->user()->id,
                'client_id'          => $client->id,
                'title'              => $request->title,
                'original_file_path' => $path,
                'original_hash'      => $hash,
                'expires_at'         => now()->addDays((int) $request->input('expiration_days', 7)),
            ]);

            SendSigningLink::dispatch($document);

            return response()->json(['data' => $document->load('client')], 201);
        });
    }

    public function cancel(Request $request, Document $document): JsonResponse
    {
        abort_if($document->user_id !== $request->user()->id, 403);
        abort_if($document->isCompleted(), 422, 'Não é possível cancelar um documento já concluído.');

        $document->update(['status' => 'cancelled']);

        return response()->json(['data' => $document, 'message' => 'Documento cancelado.']);
    }

    public function resendLink(Request $request, Document $document): JsonResponse
    {
        abort_if($document->user_id !== $request->user()->id, 403);
        abort_if(! $document->isPending(), 422, 'Apenas documentos pendentes podem ter o link reenviado.');

        $document->update(['expires_at' => now()->addDays(7)]);
        SendSigningLink::dispatch($document);

        return response()->json(['message' => 'Link reenviado com sucesso.']);
    }

    public function download(Request $request, Document $document): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        abort_if($document->user_id !== $request->user()->id, 403);
        abort_if(! $document->signed_file_path, 404, 'Documento ainda não foi assinado.');

        $filename = str($document->title)->slug()->append('.pdf')->toString();

        return Storage::download($document->signed_file_path, $filename);
    }
}
