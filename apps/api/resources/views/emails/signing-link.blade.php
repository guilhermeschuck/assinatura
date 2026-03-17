<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Documento para Assinatura</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #F8F7F4; margin: 0; padding: 0; color: #1A1A2E; }
    .container { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 16px rgba(0,0,0,0.08); }
    .header { background: #1B2E4B; padding: 32px; text-align: center; }
    .header h1 { color: #fff; margin: 0; font-size: 22px; font-weight: 600; }
    .header p { color: #C9A84C; margin: 8px 0 0; font-size: 14px; }
    .body { padding: 40px 32px; }
    .body p { margin: 0 0 16px; line-height: 1.6; }
    .document-box { background: #F8F7F4; border-left: 4px solid #C9A84C; padding: 16px 20px; border-radius: 4px; margin: 24px 0; }
    .document-box strong { display: block; font-size: 16px; color: #1B2E4B; }
    .document-box small { color: #6B7280; font-size: 13px; }
    .btn { display: inline-block; background: #1B2E4B; color: #fff !important; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 15px; margin: 8px 0; }
    .btn:hover { background: #C9A84C; }
    .expiry { background: #FEF3C7; border: 1px solid #F59E0B; border-radius: 4px; padding: 10px 16px; font-size: 13px; color: #92400E; margin-top: 20px; }
    .footer { background: #F8F7F4; padding: 20px 32px; text-align: center; font-size: 12px; color: #6B7280; border-top: 1px solid #E2DDD5; }
    .footer a { color: #1B2E4B; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📄 Documento para Assinatura</h1>
      <p>Escritório {{ $lawyerName }}</p>
    </div>
    <div class="body">
      <p>Olá, <strong>{{ $clientName }}</strong>!</p>
      <p>O(A) advogado(a) <strong>{{ $lawyerName }}</strong>{{ $oabNumber ? ' (OAB ' . $oabNumber . ')' : '' }} enviou um documento para você assinar eletronicamente.</p>

      <div class="document-box">
        <strong>{{ $documentTitle }}</strong>
        <small>Clique no botão abaixo para visualizar e assinar</small>
      </div>

      <p style="text-align:center;">
        <a href="{{ $signingUrl }}" class="btn">Visualizar e Assinar Documento</a>
      </p>

      <p style="font-size:13px;color:#6B7280;">
        Ou copie e cole este link no seu navegador:<br>
        <a href="{{ $signingUrl }}" style="color:#1B2E4B;word-break:break-all;">{{ $signingUrl }}</a>
      </p>

      @if($expiresAt)
      <div class="expiry">
        ⏰ <strong>Atenção:</strong> Este link expira em <strong>{{ $expiresAt }}</strong>. Após esse prazo, será necessário solicitar um novo link ao advogado.
      </div>
      @endif
    </div>
    <div class="footer">
      <p>Este e-mail foi enviado porque você tem um documento jurídico pendente de assinatura.</p>
      <p>A assinatura eletrônica tem validade jurídica conforme a <strong>Lei 14.063/2020</strong>.</p>
    </div>
  </div>
</body>
</html>
