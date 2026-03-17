<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Documento Assinado</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #F8F7F4; margin: 0; padding: 0; color: #1A1A2E; }
    .container { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 16px rgba(0,0,0,0.08); }
    .header { background: #0F7A5A; padding: 32px; text-align: center; }
    .header h1 { color: #fff; margin: 0; font-size: 22px; }
    .header p { color: #D1FAE5; margin: 8px 0 0; font-size: 14px; }
    .body { padding: 40px 32px; }
    .body p { margin: 0 0 16px; line-height: 1.6; }
    .hash-box { background: #F9FAFB; border: 1px solid #E2DDD5; border-radius: 6px; padding: 12px 16px; font-family: 'Courier New', monospace; font-size: 11px; word-break: break-all; color: #374151; margin: 16px 0; }
    .btn { display: inline-block; background: #1B2E4B; color: #fff !important; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 15px; }
    .footer { background: #F8F7F4; padding: 20px 32px; text-align: center; font-size: 12px; color: #6B7280; border-top: 1px solid #E2DDD5; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Documento Assinado com Sucesso!</h1>
      <p>Todas as assinaturas foram aplicadas</p>
    </div>
    <div class="body">
      <p>Olá, <strong>{{ $clientName }}</strong>!</p>
      <p>O documento <strong>{{ $documentTitle }}</strong> foi assinado por todas as partes e está legalmente válido.</p>

      <p style="text-align:center;margin:24px 0;">
        <a href="{{ $downloadUrl }}" class="btn">📥 Baixar Documento Assinado</a>
      </p>

      <p><strong>Código de Verificação de Integridade (Hash SHA-256):</strong></p>
      <div class="hash-box">{{ $finalHash }}</div>

      <p style="font-size:13px;color:#6B7280;">
        Guarde este código. Ele prova que o documento não foi alterado após as assinaturas. Qualquer modificação no arquivo resultará em um hash diferente.
      </p>
    </div>
    <div class="footer">
      <p>Este documento tem validade jurídica conforme a <strong>Lei 14.063/2020</strong> e a <strong>MP 2.200-2/2001 (ICP-Brasil)</strong>.</p>
    </div>
  </div>
</body>
</html>
