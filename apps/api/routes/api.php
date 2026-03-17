<?php

use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\CertificateController;
use App\Http\Controllers\ClientController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DocumentController;
use App\Http\Controllers\PublicSignController;
use App\Http\Controllers\SignatureController;
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
Route::prefix('public/sign/{token}')->group(function () {
    Route::get('/', [PublicSignController::class, 'show']);
    Route::get('/pdf', [PublicSignController::class, 'pdf']);
    Route::post('/', [PublicSignController::class, 'store'])
         ->middleware('throttle:10,1'); // max 10 tentativas por minuto
});

// ---------------------------------------------------------------------------
// Área autenticada — Advogado/Admin
// ---------------------------------------------------------------------------
Route::middleware('auth:sanctum')->group(function () {

    // Dashboard
    Route::get('/dashboard/stats', [DashboardController::class, 'stats']);

    // Documentos
    Route::get('/documents', [DocumentController::class, 'index']);
    Route::post('/documents', [DocumentController::class, 'store']);
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
});
