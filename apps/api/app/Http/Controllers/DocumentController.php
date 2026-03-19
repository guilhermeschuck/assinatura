<?php

namespace App\Http\Controllers;

use App\Jobs\SendSigningLink;
use App\Jobs\SendBatchSigningLink;
use App\Models\Client;
use App\Models\Document;
use App\Models\User;
use App\Services\ActivityService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class DocumentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Document::with(['client', 'lawyer'])
            ->whereIn('user_id', User::teamUserIds())
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

        if ($lawyerId = $request->query('lawyer_id')) {
            $query->where('user_id', (int) $lawyerId);
        }

        return response()->json($query->paginate(15));
    }

    public function show(Request $request, Document $document): JsonResponse
    {
        abort_if(! in_array($document->user_id, User::teamUserIds()), 403);

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
                Rule::exists('clients', 'id')->where(function ($query) {
                    $query->whereIn('user_id', User::teamUserIds());
                }),
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
                $existing = Client::whereIn('user_id', User::teamUserIds())
                    ->where('cpf', $request->input('client.cpf'))
                    ->first();

                if ($existing) {
                    $existing->update([
                        'name'     => $request->input('client.name'),
                        'email'    => $request->input('client.email'),
                        'whatsapp' => $request->input('client.whatsapp'),
                    ]);
                    $client = $existing;
                } else {
                    $client = Client::create([
                        'user_id'  => $request->user()->id,
                        'cpf'      => $request->input('client.cpf'),
                        'name'     => $request->input('client.name'),
                        'email'    => $request->input('client.email'),
                        'whatsapp' => $request->input('client.whatsapp'),
                    ]);
                }
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

            ActivityService::log(
                action:      'document_created',
                description: "{$request->user()->name} criou o documento \"{$document->title}\" e enviou o link para {$client->name} ({$client->email})",
                user:        $request->user(),
                subject:     $document,
                metadata:    ['client_name' => $client->name, 'client_email' => $client->email, 'document_title' => $document->title],
            );

            return response()->json(['data' => $document->load('client')], 201);
        });
    }

    public function cancel(Request $request, Document $document): JsonResponse
    {
        abort_if(! in_array($document->user_id, User::teamUserIds()), 403);
        abort_if($document->isCompleted(), 422, 'Não é possível cancelar um documento já concluído.');

        $document->update(['status' => 'cancelled']);

        ActivityService::log(
            action:      'document_cancelled',
            description: "{$request->user()->name} cancelou o documento \"{$document->title}\"",
            user:        $request->user(),
            subject:     $document,
        );

        return response()->json(['data' => $document, 'message' => 'Documento cancelado.']);
    }

    public function resendLink(Request $request, Document $document): JsonResponse
    {
        abort_if(! in_array($document->user_id, User::teamUserIds()), 403);
        abort_if(! $document->isPending(), 422, 'Apenas documentos pendentes podem ter o link reenviado.');

        $document->update(['expires_at' => now()->addDays(7)]);
        SendSigningLink::dispatch($document);

        ActivityService::log(
            action:      'link_resent',
            description: "{$request->user()->name} reenviou o link de assinatura do documento \"{$document->title}\" para {$document->client->name}",
            user:        $request->user(),
            subject:     $document,
        );

        return response()->json(['message' => 'Link reenviado com sucesso.']);
    }

    public function download(Request $request, Document $document): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        abort_if(! in_array($document->user_id, User::teamUserIds()), 403);
        abort_if(! $document->signed_file_path, 404, 'Documento ainda não foi assinado.');

        $filename = str($document->title)->slug()->append('.pdf')->toString();

        return Storage::download($document->signed_file_path, $filename);
    }

    /**
     * Cria múltiplos documentos em lote para o mesmo cliente assinar de uma só vez.
     */
    public function storeBatch(Request $request): JsonResponse
    {
        $request->validate([
            'titles'           => ['required', 'array', 'min:2', 'max:20'],
            'titles.*'         => ['required', 'string', 'max:255'],
            'pdf_files'        => ['required', 'array', 'min:2', 'max:20'],
            'pdf_files.*'      => ['required', 'file', 'mimes:pdf', 'max:20480'],
            'expiration_days'  => ['integer', 'min:1', 'max:90'],
            'client_id'        => [
                'nullable', 'integer',
                Rule::exists('clients', 'id')->where(function ($query) {
                    $query->whereIn('user_id', User::teamUserIds());
                }),
            ],
            'client.name'     => ['required_without:client_id', 'string', 'max:255'],
            'client.cpf'      => ['required_without:client_id', 'string', 'max:14'],
            'client.email'    => ['required_without:client_id', 'email', 'max:255'],
            'client.whatsapp' => ['nullable', 'string', 'max:20'],
        ]);

        abort_if(
            count($request->file('pdf_files', [])) !== count($request->input('titles', [])),
            422,
            'A quantidade de títulos deve corresponder à quantidade de PDFs.',
        );

        return DB::transaction(function () use ($request) {
            if ($request->client_id) {
                $client = Client::findOrFail($request->client_id);
            } else {
                $existing = Client::whereIn('user_id', User::teamUserIds())
                    ->where('cpf', $request->input('client.cpf'))
                    ->first();

                if ($existing) {
                    $existing->update([
                        'name'     => $request->input('client.name'),
                        'email'    => $request->input('client.email'),
                        'whatsapp' => $request->input('client.whatsapp'),
                    ]);
                    $client = $existing;
                } else {
                    $client = Client::create([
                        'user_id'  => $request->user()->id,
                        'cpf'      => $request->input('client.cpf'),
                        'name'     => $request->input('client.name'),
                        'email'    => $request->input('client.email'),
                        'whatsapp' => $request->input('client.whatsapp'),
                    ]);
                }
            }

            $batchToken = (string) Str::uuid();
            $expiresAt  = now()->addDays((int) $request->input('expiration_days', 7));
            $documents  = [];

            foreach ($request->file('pdf_files') as $index => $pdfFile) {
                $path = $pdfFile->store("documents/{$request->user()->id}/originals", 'local');
                $hash = hash_file('sha256', $pdfFile->getRealPath());

                $document = Document::create([
                    'user_id'            => $request->user()->id,
                    'client_id'          => $client->id,
                    'title'              => $request->input("titles.{$index}"),
                    'original_file_path' => $path,
                    'original_hash'      => $hash,
                    'batch_token'        => $batchToken,
                    'expires_at'         => $expiresAt,
                ]);

                $documents[] = $document;
            }

            SendBatchSigningLink::dispatch($documents[0], $batchToken);

            ActivityService::log(
                action:      'document_created',
                description: "{$request->user()->name} criou " . count($documents) . " documentos em lote e enviou o link para {$client->name} ({$client->email})",
                user:        $request->user(),
                subject:     $documents[0],
                metadata:    [
                    'client_name'   => $client->name,
                    'client_email'  => $client->email,
                    'batch_token'   => $batchToken,
                    'document_count' => count($documents),
                ],
            );

            $loaded = Document::with('client')->whereIn('id', array_map(fn ($d) => $d->id, $documents))->get();

            return response()->json(['data' => $loaded, 'batch_token' => $batchToken], 201);
        });
    }
}
