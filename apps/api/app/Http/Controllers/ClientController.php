<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClientController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Client::whereIn('user_id', User::teamUserIds())->latest();

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                  ->orWhere('cpf', 'like', "%{$search}%")
                  ->orWhere('email', 'ilike', "%{$search}%");
            });
        }

        return response()->json($query->paginate(20));
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'     => ['required', 'string', 'max:255'],
            'cpf'      => ['required', 'string', 'max:14'],
            'email'    => ['required', 'email', 'max:255'],
            'whatsapp' => ['nullable', 'string', 'max:20'],
        ]);

        $existing = Client::whereIn('user_id', User::teamUserIds())
            ->where('cpf', $validated['cpf'])
            ->first();

        if ($existing) {
            $existing->update(collect($validated)->except('cpf')->toArray());
            $client = $existing;
        } else {
            $client = Client::create(array_merge($validated, ['user_id' => $request->user()->id]));
        }

        return response()->json(['data' => $client], $client->wasRecentlyCreated ? 201 : 200);
    }

    public function show(Request $request, Client $client): JsonResponse
    {
        abort_if(! in_array($client->user_id, User::teamUserIds()), 403);

        return response()->json(['data' => $client->load('documents')]);
    }

    public function update(Request $request, Client $client): JsonResponse
    {
        abort_if(! in_array($client->user_id, User::teamUserIds()), 403);

        $validated = $request->validate([
            'name'     => ['sometimes', 'string', 'max:255'],
            'email'    => ['sometimes', 'email', 'max:255'],
            'whatsapp' => ['nullable', 'string', 'max:20'],
        ]);

        $client->update($validated);

        return response()->json(['data' => $client]);
    }

    public function destroy(Request $request, Client $client): JsonResponse
    {
        abort_if(! in_array($client->user_id, User::teamUserIds()), 403);

        $client->delete();

        return response()->json(['message' => 'Cliente removido.'], 204);
    }
}
