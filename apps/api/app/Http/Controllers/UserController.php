<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\ActivityService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    /**
     * Lista todos os membros da equipe.
     */
    public function index(Request $request): JsonResponse
    {

        $users = User::query()
            ->when($request->search, fn ($q, $s) =>
                $q->where(fn ($q) =>
                    $q->whereILike('name', "%{$s}%")
                      ->orWhereILike('email', "%{$s}%")
                      ->orWhereILike('oab_number', "%{$s}%")
                )
            )
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'role', 'oab_number', 'phone', 'created_at']);

        return response()->json(['data' => $users]);
    }

    /**
     * Cria um novo membro da equipe com senha temporária.
     */
    public function store(Request $request): JsonResponse
    {
        abort_if(! $request->user()->isAdmin(), 403, 'Apenas administradores podem convidar membros.');

        $data = $request->validate([
            'name'       => ['required', 'string', 'max:255'],
            'email'      => ['required', 'email', 'unique:users,email'],
            'role'       => ['required', Rule::in(['admin', 'lawyer'])],
            'oab_number' => ['nullable', 'string', 'max:50'],
            'phone'      => ['nullable', 'string', 'max:20'],
        ]);

        $tempPassword = Str::random(12);

        $user = User::create([
            ...$data,
            'password' => Hash::make($tempPassword),
        ]);

        // Envia email com credenciais de acesso
        \Illuminate\Support\Facades\Mail::send(
            'emails.team-invite',
            [
                'inviteeName'  => $user->name,
                'invitedByName' => $request->user()->name,
                'email'        => $user->email,
                'tempPassword' => $tempPassword,
                'loginUrl'     => config('app.frontend_url') . '/login',
                'role'         => $user->role === 'admin' ? 'Administrador' : 'Advogado',
            ],
            fn ($msg) => $msg
                ->to($user->email, $user->name)
                ->subject('Você foi adicionado ao sistema de assinaturas'),
        );

        ActivityService::log(
            action:      'user_invited',
            description: "{$request->user()->name} adicionou {$user->name} ({$user->email}) como " . ($user->role === 'admin' ? 'Administrador' : 'Advogado'),
            user:        $request->user(),
            subject:     $user,
        );

        return response()->json(['data' => $user], 201);
    }

    /**
     * Atualiza dados de um membro.
     */
    public function update(Request $request, User $user): JsonResponse
    {
        abort_if(! $request->user()->isAdmin(), 403, 'Apenas administradores podem editar membros.');

        $data = $request->validate([
            'name'       => ['required', 'string', 'max:255'],
            'role'       => ['required', Rule::in(['admin', 'lawyer'])],
            'oab_number' => ['nullable', 'string', 'max:50'],
            'phone'      => ['nullable', 'string', 'max:20'],
        ]);

        $user->update($data);

        return response()->json(['data' => $user->fresh()]);
    }

    /**
     * Remove um membro (não pode remover a si mesmo).
     */
    public function destroy(Request $request, User $user): JsonResponse
    {
        abort_if(! $request->user()->isAdmin(), 403, 'Apenas administradores podem remover membros.');
        abort_if($request->user()->id === $user->id, 422, 'Você não pode remover a sua própria conta.');

        $removedName  = $user->name;
        $removedEmail = $user->email;
        $user->tokens()->delete();
        $user->delete();

        ActivityService::log(
            action:      'user_removed',
            description: "{$request->user()->name} removeu o membro {$removedName} ({$removedEmail}) da equipe",
            user:        $request->user(),
        );

        return response()->json(['message' => 'Membro removido com sucesso.']);
    }

    /**
     * Redefine a senha de um membro e envia por email.
     */
    public function resetPassword(Request $request, User $user): JsonResponse
    {
        abort_if(! $request->user()->isAdmin(), 403, 'Apenas administradores podem redefinir senhas.');

        $newPassword = Str::random(12);
        $user->update(['password' => Hash::make($newPassword)]);
        $user->tokens()->delete(); // invalida sessões ativas

        \Illuminate\Support\Facades\Mail::send(
            'emails.team-invite',
            [
                'inviteeName'   => $user->name,
                'invitedByName' => $request->user()->name,
                'email'         => $user->email,
                'tempPassword'  => $newPassword,
                'loginUrl'      => config('app.frontend_url') . '/login',
                'role'          => $user->role === 'admin' ? 'Administrador' : 'Advogado',
                'isReset'       => true,
            ],
            fn ($msg) => $msg
                ->to($user->email, $user->name)
                ->subject('Sua senha foi redefinida — KoetzSing'),
        );

        return response()->json(['message' => 'Nova senha enviada por e-mail.']);
    }
}
