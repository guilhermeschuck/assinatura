<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>{{ $isReset ?? false ? 'Nova Senha' : 'Convite de Acesso' }} — KoetzSing</title>
</head>
<body style="margin:0;padding:0;background:#F8F7F4;font-family:'Georgia',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8F7F4;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #E2DDD5;">

          <!-- Header -->
          <tr>
            <td style="background:#1B2E4B;padding:32px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="display:inline-flex;align-items:center;gap:10px;">
                      <div style="width:36px;height:36px;background:#C9A84C;border-radius:8px;display:inline-block;vertical-align:middle;"></div>
                      <span style="font-size:18px;color:#ffffff;font-weight:600;vertical-align:middle;margin-left:10px;">KoetzSing</span>
                    </div>
                    <p style="margin:8px 0 0;color:#C9A84C;font-size:13px;letter-spacing:0.05em;text-transform:uppercase;">
                      {{ $isReset ?? false ? 'Redefinição de Senha' : 'Convite de Acesso' }}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 20px;font-size:16px;color:#1B2E4B;line-height:1.6;">
                Olá, <strong>{{ $inviteeName }}</strong>!
              </p>
              @if($isReset ?? false)
              <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.7;">
                <strong>{{ $invitedByName }}</strong> redefiniu sua senha no sistema de assinatura digital. Use as credenciais abaixo para acessar.
              </p>
              @else
              <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.7;">
                <strong>{{ $invitedByName }}</strong> adicionou você ao sistema de assinatura digital jurídica como <strong>{{ $role }}</strong>.
                Use as credenciais abaixo para acessar o sistema.
              </p>
              @endif

              <!-- Credentials box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8F7F4;border:1px solid #E2DDD5;border-radius:8px;margin:24px 0;">
                <tr>
                  <td style="padding:24px;">
                    <p style="margin:0 0 4px;font-size:11px;color:#6B7280;text-transform:uppercase;letter-spacing:0.1em;">E-mail de acesso</p>
                    <p style="margin:0 0 16px;font-size:15px;color:#1B2E4B;font-weight:600;">{{ $email }}</p>
                    <p style="margin:0 0 4px;font-size:11px;color:#6B7280;text-transform:uppercase;letter-spacing:0.1em;">Senha temporária</p>
                    <p style="margin:0;font-size:20px;color:#1B2E4B;font-weight:700;letter-spacing:0.15em;font-family:monospace;">{{ $tempPassword }}</p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 28px;font-size:14px;color:#6B7280;">
                Recomendamos que você altere sua senha após o primeiro acesso.
              </p>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#1B2E4B;border-radius:8px;">
                    <a href="{{ $loginUrl }}" style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;letter-spacing:0.02em;">
                      Acessar o Sistema →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #E2DDD5;background:#FDFCF9;">
              <p style="margin:0;font-size:12px;color:#9CA3AF;line-height:1.6;">
                Este acesso é pessoal e intransferível. Em caso de dúvidas, entre em contato com o administrador do sistema.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
