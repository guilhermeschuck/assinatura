<?php

use App\Http\Controllers\ActivityLogController;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\CertificateController;
use App\Http\Controllers\ClientController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DocumentController;
use App\Http\Controllers\PublicSignController;
use App\Http\Controllers\SettingController;
use App\Http\Controllers\SignatureController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

// ---------------------------------------------------------------------------
// Autenticação
// ---------------------------------------------------------------------------
Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
    });
});

// ---------------------------------------------------------------------------
// Área pública — assinatura do cliente (sem autenticação)
// ---------------------------------------------------------------------------
// Área pública — assinatura em lote (batch) — deve vir antes da rota individual
// ---------------------------------------------------------------------------
Route::prefix('public/sign/batch/{batchToken}')->whereUuid('batchToken')->group(function () {
    Route::get('/', [PublicSignController::class, 'showBatch']);
    Route::get('/pdf/{documentId}', [PublicSignController::class, 'batchPdf'])
         ->whereNumber('documentId');
    Route::post('/', [PublicSignController::class, 'storeBatch'])
         ->middleware('throttle:10,1');
});

// ---------------------------------------------------------------------------
// Área pública — assinatura do cliente (sem autenticação)
// ---------------------------------------------------------------------------
Route::prefix('public/sign/{token}')->whereUuid('token')->group(function () {
    Route::get('/', [PublicSignController::class, 'show']);
    Route::get('/pdf', [PublicSignController::class, 'pdf']);
    Route::get('/download', [PublicSignController::class, 'downloadSigned']);
    Route::post('/', [PublicSignController::class, 'store'])
         ->middleware('throttle:10,1'); // max 10 tentativas por minuto
});

// Verificação pública de autenticidade do documento
Route::get('/public/verify/{token}', [PublicSignController::class, 'verify'])
    ->whereUuid('token');

// ---------------------------------------------------------------------------
// Área autenticada — Advogado/Admin
// ---------------------------------------------------------------------------
Route::middleware('auth:sanctum')->group(function () {

    // Dashboard
    Route::get('/dashboard/stats', [DashboardController::class, 'stats']);

    // Documentos
    Route::get('/documents', [DocumentController::class, 'index']);
    Route::post('/documents', [DocumentController::class, 'store']);
    Route::post('/documents/batch', [DocumentController::class, 'storeBatch']);
    Route::get('/documents/{document}', [DocumentController::class, 'show']);
    Route::patch('/documents/{document}/cancel', [DocumentController::class, 'cancel']);
    Route::post('/documents/{document}/resend-link', [DocumentController::class, 'resendLink']);
    Route::get('/documents/{document}/download', [DocumentController::class, 'download']);

    // Assinatura do advogado
    Route::post('/documents/{document}/sign-lawyer', [SignatureController::class, 'signAsLawyer']);

    // Clientes
    Route::apiResource('clients', ClientController::class);

    // Certificados A1
    Route::get('/certificates', [CertificateController::class, 'index']);
    Route::post('/certificates', [CertificateController::class, 'store']);
    Route::delete('/certificates/{certificate}', [CertificateController::class, 'destroy']);

    // Equipe (apenas admin)
    Route::get('/team', [UserController::class, 'index']);
    Route::post('/team', [UserController::class, 'store']);
    Route::put('/team/{user}', [UserController::class, 'update']);
    Route::delete('/team/{user}', [UserController::class, 'destroy']);
    Route::post('/team/{user}/reset-password', [UserController::class, 'resetPassword']);

    // Log de atividades (apenas admin)
    Route::get('/activity-logs', [ActivityLogController::class, 'index']);

    // Configurações (apenas admin)
    Route::get('/settings', [SettingController::class, 'index']);
    Route::put('/settings', [SettingController::class, 'update']);
});
