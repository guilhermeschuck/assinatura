<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ActivityLogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        abort_if(! $request->user()->isAdmin(), 403, 'Apenas administradores podem acessar o log de atividades.');

        $query = ActivityLog::with('user:id,name,email,role')
            ->latest('created_at');

        if ($action = $request->query('action')) {
            $query->where('action', $action);
        }

        if ($search = $request->query('search')) {
            $query->where('description', 'ilike', "%{$search}%");
        }

        return response()->json($query->paginate(30));
    }
}
