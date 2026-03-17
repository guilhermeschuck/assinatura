# Sistema de Assinatura Eletrônica e Digital para Escritórios de Advocacia

> **Arquitetura:** Monorepo · **Validade Jurídica:** MP 2.200-2/2001 + Lei 14.063/2020 · **Stack:** React + Laravel + PostgreSQL

---

## Sumário

1. [Visão Geral](#visão-geral)
2. [Stack Tecnológico](#stack-tecnológico)
3. [Estrutura do Monorepo](#estrutura-do-monorepo)
4. [Requisitos Legais e de Conformidade](#requisitos-legais-e-de-conformidade)
5. [Fluxo do Sistema](#fluxo-do-sistema)
6. [Banco de Dados](#banco-de-dados)
7. [Backend — Laravel](#backend--laravel)
8. [Frontend — React](#frontend--react)
9. [Design System](#design-system)
10. [Plano de Desenvolvimento por Etapas](#plano-de-desenvolvimento-por-etapas)
11. [Segurança](#segurança)
12. [Deploy e Infraestrutura](#deploy-e-infraestrutura)

---

## Visão Geral

Sistema completo para escritórios de advocacia enviarem documentos jurídicos (procurações, contratos de honorários, etc.) para clientes assinarem **eletronicamente** e para advogados assinarem **digitalmente via Certificado A1 ICP-Brasil**, garantindo plena validade jurídica no ordenamento brasileiro.

### Tipos de Assinatura Suportados

| Tipo | Quem usa | Método | Base Legal |
|------|----------|--------|------------|
| **Eletrônica Avançada** | Cliente | IP + Geo + Selfie + Timestamp | Lei 14.063/2020, Art. 4º, II |
| **Digital Qualificada** | Advogado | Certificado A1 ICP-Brasil (PAdES) | MP 2.200-2/2001 |

---

## Stack Tecnológico

### Frontend
- **Framework:** React 18+ com Vite
- **Estilização:** Tailwind CSS v3
- **Gerenciador de Estado:** Zustand
- **Requisições HTTP:** Axios
- **Visualização de PDF:** `react-pdf` (`pdfjs-dist`)
- **Captura de câmera:** API `getUserMedia` nativa
- **Animações:** Framer Motion
- **Formulários:** React Hook Form + Zod

### Backend
- **Framework:** Laravel 11 (PHP 8.3+)
- **Autenticação:** Laravel Sanctum
- **Jobs/Filas:** Laravel Queues (Redis ou database driver)
- **Manipulação de PDF:** `setasign/fpdi` + `tecnickcom/tcpdf`
- **Assinatura Digital PAdES:** `sop-digital/signer` ou `openssl_pkcs7_sign` nativo do PHP
- **Storage:** Laravel Filesystem (S3 ou disco local estruturado)
- **E-mail:** Laravel Mail (Mailgun/SES)
- **Hash/Criptografia:** `hash('sha256', ...)` + `openssl_encrypt`

### Banco de Dados
- **SGBD:** PostgreSQL 16+
- **ORM:** Eloquent (Laravel)
- **Migrations:** Laravel Migrations

### Infraestrutura
- **Containerização:** Docker + Docker Compose
- **Reverse Proxy:** Nginx
- **Cache:** Redis
- **Storage de objetos:** AWS S3 (ou MinIO para self-hosted)
- **CI/CD:** GitHub Actions

---

## Estrutura do Monorepo

```
assinatura/
├── apps/
│   ├── web/                        # Frontend React (Vite)
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── dashboard/      # Componentes do painel do advogado
│   │   │   │   ├── signing/        # Área pública de assinatura do cliente
│   │   │   │   └── ui/             # Design system (Button, Input, Modal...)
│   │   │   ├── pages/
│   │   │   │   ├── Dashboard.tsx
│   │   │   │   ├── DocumentList.tsx
│   │   │   │   ├── NewDocument.tsx
│   │   │   │   ├── CertificateSettings.tsx
│   │   │   │   └── Sign.tsx        # Rota pública: /sign/:token
│   │   │   ├── hooks/
│   │   │   ├── stores/             # Zustand stores
│   │   │   ├── services/           # Camada de API (Axios)
│   │   │   └── utils/
│   │   ├── public/
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   └── tailwind.config.ts
│   │
│   └── api/                        # Backend Laravel
│       ├── app/
│       │   ├── Http/
│       │   │   ├── Controllers/
│       │   │   │   ├── Auth/
│       │   │   │   ├── DocumentController.php
│       │   │   │   ├── SignatureController.php
│       │   │   │   ├── CertificateController.php
│       │   │   │   └── PublicSignController.php
│       │   │   ├── Middleware/
│       │   │   └── Requests/
│       │   ├── Models/
│       │   │   ├── User.php
│       │   │   ├── Client.php
│       │   │   ├── Document.php
│       │   │   ├── Signature.php
│       │   │   └── Certificate.php
│       │   ├── Services/
│       │   │   ├── PdfSignerService.php
│       │   │   ├── ManifestService.php
│       │   │   ├── CertificateService.php
│       │   │   └── NotificationService.php
│       │   └── Jobs/
│       │       ├── ApplyAdvogadoSignature.php
│       │       └── SendSigningLink.php
│       ├── database/
│       │   ├── migrations/
│       │   └── seeders/
│       ├── routes/
│       │   ├── api.php
│       │   └── web.php
│       └── storage/
│
├── docker/
│   ├── nginx/
│   ├── php/
│   └── postgres/
├── docker-compose.yml
├── docker-compose.prod.yml
├── .env.example
└── BLUEPRINT.md                    # Este arquivo
```

---

## Requisitos Legais e de Conformidade

### Assinatura Eletrônica Avançada (Cliente)

Para conformidade com a **Lei 14.063/2020, Art. 4º, II**, o sistema DEVE coletar e armazenar:

- [x] **Aceite explícito** dos termos via checkbox
- [x] **Endereço IP** público do cliente
- [x] **User-Agent** do navegador
- [x] **Geolocalização** (latitude/longitude via API do browser — requer consentimento)
- [x] **Timestamp** em UTC com timezone do cliente
- [x] **Selfie com documento** (RG ou CNH próximo ao rosto) — comprovação biométrica
- [x] **Hash SHA-256** do documento no momento da assinatura

### Assinatura Digital Qualificada (Advogado)

Para conformidade com a **MP 2.200-2/2001**, o sistema DEVE:

- [x] Utilizar **Certificado Digital A1** emitido por Autoridade Certificadora credenciada pelo ICP-Brasil
- [x] Aplicar assinatura no padrão **PAdES** (PDF Advanced Electronic Signatures)
- [x] Incorporar **carimbo de tempo** (timestamp) na assinatura
- [x] Armazenar o arquivo `.pfx`/`.p12` de forma **criptografada** (AES-256)
- [x] Nunca expor a chave privada ou senha em logs

### Manifesto de Assinatura (Página de Auditoria)

O PDF final deve conter uma **página extra** ao final com:

```
┌─────────────────────────────────────────────────────────┐
│           MANIFESTO DE ASSINATURA ELETRÔNICA            │
├──────────────────────┬──────────────────────────────────┤
│ Documento            │ [Título + Hash SHA-256]           │
│ Data/Hora (UTC)      │ [Timestamp ISO 8601]              │
├──────────────────────┴──────────────────────────────────┤
│ ASSINANTE — CLIENTE                                      │
│ Nome: [Nome completo]  CPF: [XXX.XXX.XXX-XX]            │
│ E-mail: [email]        WhatsApp: [número]               │
│ IP: [xxx.xxx.xxx.xxx]  Geo: [lat, lng]                  │
│ User-Agent: [string]                                     │
│ [Imagem da Selfie com documento]                         │
├─────────────────────────────────────────────────────────┤
│ ASSINANTE — ADVOGADO (ICP-Brasil)                        │
│ Nome: [Nome do advogado]  OAB: [número]                 │
│ Certificado: [Emissor + Número de série]                 │
│ Algoritmo: SHA-256 with RSA  Padrão: PAdES              │
│ Carimbador de Tempo: [TSA utilizada]                     │
└─────────────────────────────────────────────────────────┘
```

---

## Fluxo do Sistema

### Fluxo Completo

```
[Advogado]
    │
    ├─► 1. Faz upload do PDF + cadastra dados do cliente
    │
    ├─► 2. Sistema gera token UUID único e link seguro
    │       URL: https://app.example.com/sign/{uuid-token}
    │
    ├─► 3. Sistema envia link por e-mail e/ou WhatsApp
    │
    └─► 4. Painel mostra status: "Aguardando Cliente"

[Cliente — acessa link público]
    │
    ├─► 5. Visualiza o documento PDF na tela
    │
    ├─► 6. Lê e marca checkbox de aceite dos termos
    │
    ├─► 7. Sistema captura IP + User-Agent (background)
    │
    ├─► 8. Solicita permissão de geolocalização
    │
    ├─► 9. Cliente faz upload/câmera: selfie + documento
    │
    └─► 10. Clica em "Assinar Eletronicamente"
            → Backend registra tudo na tabela `signatures`
            → Status muda para: "Aguardando Advogado"

[Advogado — recebe notificação]
    │
    ├─► 11. Acessa o documento no painel
    │
    ├─► 12. Visualiza evidências do cliente
    │
    └─► 13. Clica em "Assinar com Certificado A1"
            → Backend:
              a) Gera página de manifesto (TCPDF/FPDI)
              b) Injeta manifesto no PDF
              c) Aplica assinatura PAdES com o A1
              d) Gera Hash SHA-256 final
              e) Salva PDF assinado no storage
            → Status muda para: "Concluído"

[Resultado]
    └─► 14. Ambas as partes recebem o PDF final assinado por e-mail
```

---

## Banco de Dados

### Estrutura Completa das Tabelas

#### `users` — Advogados e Administradores

```sql
CREATE TABLE users (
    id            BIGSERIAL PRIMARY KEY,
    name          VARCHAR(255) NOT NULL,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password      VARCHAR(255) NOT NULL,
    oab_number    VARCHAR(50),
    role          VARCHAR(50) NOT NULL DEFAULT 'lawyer', -- 'admin' | 'lawyer'
    email_verified_at TIMESTAMP,
    remember_token VARCHAR(100),
    created_at    TIMESTAMP,
    updated_at    TIMESTAMP
);
```

#### `clients` — Dados dos Clientes

```sql
CREATE TABLE clients (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name       VARCHAR(255) NOT NULL,
    cpf        VARCHAR(14) NOT NULL,
    email      VARCHAR(255) NOT NULL,
    whatsapp   VARCHAR(20),
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

#### `certificates` — Certificados A1 dos Advogados

```sql
CREATE TABLE certificates (
    id                 BIGSERIAL PRIMARY KEY,
    user_id            BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_path          VARCHAR(500) NOT NULL,   -- caminho criptografado no storage
    password_encrypted TEXT NOT NULL,           -- AES-256 via app key
    issuer             VARCHAR(255),            -- Emissor do certificado
    subject            VARCHAR(255),            -- Nome no certificado
    serial_number      VARCHAR(100),
    valid_from         TIMESTAMP,
    valid_until        TIMESTAMP,
    is_active          BOOLEAN NOT NULL DEFAULT true,
    created_at         TIMESTAMP,
    updated_at         TIMESTAMP
);
```

#### `documents` — Metadados dos Documentos

```sql
CREATE TABLE documents (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             BIGINT NOT NULL REFERENCES users(id),
    client_id           BIGINT NOT NULL REFERENCES clients(id),
    title               VARCHAR(255) NOT NULL,
    original_file_path  VARCHAR(500) NOT NULL,   -- PDF original
    signed_file_path    VARCHAR(500),            -- PDF final assinado
    signing_token       UUID NOT NULL UNIQUE,     -- token do link público
    status              VARCHAR(50) NOT NULL DEFAULT 'pending',
        -- 'pending' | 'client_signed' | 'completed' | 'expired' | 'cancelled'
    original_hash       VARCHAR(64),             -- SHA-256 do PDF original
    final_hash          VARCHAR(64),             -- SHA-256 do PDF final
    expires_at          TIMESTAMP,               -- expiração do link
    created_at          TIMESTAMP,
    updated_at          TIMESTAMP
);

CREATE INDEX idx_documents_signing_token ON documents(signing_token);
CREATE INDEX idx_documents_status ON documents(status);
```

#### `signatures` — Registro de Assinaturas

```sql
CREATE TABLE signatures (
    id             BIGSERIAL PRIMARY KEY,
    document_id    BIGINT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    signer_type    VARCHAR(50) NOT NULL,  -- 'client' | 'lawyer'
    signer_id      BIGINT,               -- user_id (advogado) ou null (cliente)
    -- Dados de identificação do cliente
    signer_name    VARCHAR(255),
    signer_cpf     VARCHAR(14),
    signer_email   VARCHAR(255),
    -- Evidências eletrônicas
    ip_address     INET,
    user_agent     TEXT,
    latitude       DECIMAL(10, 8),
    longitude      DECIMAL(11, 8),
    selfie_path    VARCHAR(500),          -- caminho da selfie no storage
    -- Dados da assinatura digital (advogado)
    signature_type VARCHAR(50),           -- 'electronic' | 'digital_icp'
    certificate_id BIGINT REFERENCES certificates(id),
    -- Rastreabilidade
    document_hash  VARCHAR(64),           -- hash do doc no momento da assinatura
    signed_at      TIMESTAMP NOT NULL,
    created_at     TIMESTAMP,
    updated_at     TIMESTAMP
);
```

---

## Backend — Laravel

### Rotas da API (`routes/api.php`)

```php
// Rotas autenticadas (Sanctum)
Route::middleware('auth:sanctum')->group(function () {

    // Documentos
    Route::apiResource('documents', DocumentController::class);
    Route::post('documents/{document}/sign-lawyer', [SignatureController::class, 'signAsLawyer']);
    Route::get('documents/{document}/download', [DocumentController::class, 'download']);

    // Certificados A1
    Route::post('certificates', [CertificateController::class, 'store']);
    Route::get('certificates', [CertificateController::class, 'index']);
    Route::delete('certificates/{certificate}', [CertificateController::class, 'destroy']);

    // Clientes
    Route::apiResource('clients', ClientController::class);

    // Dashboard stats
    Route::get('dashboard/stats', [DashboardController::class, 'stats']);
});

// Rotas públicas (área do cliente)
Route::prefix('public')->group(function () {
    Route::get('sign/{token}', [PublicSignController::class, 'show']);
    Route::post('sign/{token}', [PublicSignController::class, 'store']);
});
```

### Serviços Principais

#### `PdfSignerService.php` — Responsabilidades

```
1. Receber o PDF original + dados das assinaturas
2. Usar ManifestService para gerar a página de auditoria
3. Usar FPDI para fundir o manifesto ao PDF original
4. Aplicar assinatura PAdES com OpenSSL + certificado A1
5. Calcular hash SHA-256 do PDF final
6. Salvar no storage e retornar o caminho
```

#### `CertificateService.php` — Responsabilidades

```
1. Receber o arquivo .pfx/.p12 e a senha
2. Validar o certificado: openssl_pkcs12_read()
3. Extrair metadados: emissor, validade, número de série
4. Criptografar a senha: encrypt() do Laravel (AES-256-CBC)
5. Armazenar o arquivo em disco privado (fora do public/)
6. Salvar metadados na tabela certificates
```

#### `ManifestService.php` — Responsabilidades

```
1. Receber todos os dados de auditoria
2. Usar TCPDF para renderizar a página HTML → PDF
3. Incluir a imagem da selfie no PDF
4. Incluir QR Code de verificação (opcional)
5. Retornar o PDF do manifesto como buffer
```

### Variáveis de Ambiente (`.env.example`)

```dotenv
APP_NAME="Assinatura Jurídica"
APP_ENV=production
APP_KEY=
APP_DEBUG=false
APP_URL=https://api.seudominio.com.br

DB_CONNECTION=pgsql
DB_HOST=postgres
DB_PORT=5432
DB_DATABASE=assinatura_db
DB_USERNAME=
DB_PASSWORD=

REDIS_HOST=redis
REDIS_PORT=6379

FILESYSTEM_DISK=s3
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_DEFAULT_REGION=sa-east-1
AWS_BUCKET=

MAIL_MAILER=mailgun
MAILGUN_DOMAIN=
MAILGUN_SECRET=

# Chave extra para criptografar senhas dos certificados A1
CERTIFICATE_ENCRYPTION_KEY=

FRONTEND_URL=https://app.seudominio.com.br
```

---

## Frontend — React

### Páginas e Responsabilidades

#### Dashboard Administrativo (`/dashboard`)

| Componente | Responsabilidade |
|------------|-----------------|
| `DocumentList` | Listagem com filtro de status e busca |
| `NewDocument` | Upload PDF + cadastro/seleção de cliente |
| `DocumentDetail` | Visualizar evidências + botão "Assinar com A1" |
| `CertificateSettings` | Upload do `.pfx` + senha + status de validade |
| `StatusBadge` | Indicador visual de status com cores |

#### Área do Cliente (`/sign/:token`) — Página Pública

```
Sequência de Steps (wizard):

Step 1 → Tela de boas-vindas
         Exibe: nome do escritório, título do documento
         Ação: "Visualizar Documento"

Step 2 → Visualizador de PDF
         Componente: react-pdf
         Ação: "Li o documento, continuar"

Step 3 → Aceite dos termos
         Checkbox obrigatório com texto legal
         Ação: "Aceitar e continuar"

Step 4 → Captura de evidências
         - Solicita geolocalização (browser API)
         - Upload ou câmera: selfie + documento
         Ação: "Continuar"

Step 5 → Confirmação e assinatura
         Resumo dos dados + aviso legal
         Ação: "Assinar Eletronicamente" (botão grande, destacado)

Step 6 → Tela de sucesso
         Mensagem: "Documento assinado com sucesso!"
         Info: "Você receberá uma cópia por e-mail após a assinatura do advogado."
```

### Estrutura de Serviços API (`src/services/`)

```typescript
// api.ts — instância base do Axios
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// documents.service.ts
export const documentsService = {
  list: (params) => api.get('/documents', { params }),
  create: (data: FormData) => api.post('/documents', data),
  get: (id: number) => api.get(`/documents/${id}`),
  signAsLawyer: (id: number) => api.post(`/documents/${id}/sign-lawyer`),
  download: (id: number) => api.get(`/documents/${id}/download`, { responseType: 'blob' }),
};

// public.service.ts
export const publicService = {
  getDocument: (token: string) => api.get(`/public/sign/${token}`),
  submitSignature: (token: string, data: FormData) => api.post(`/public/sign/${token}`, data),
};
```

---

## Design System

### Identidade Visual

O sistema deve transmitir **confiança, seriedade e modernidade** — valores essenciais para um escritório de advocacia.

**Paleta de cores sugerida:**
```css
:root {
  /* Primárias */
  --color-primary:    #1B2E4B;  /* Azul marinho profundo — seriedade */
  --color-secondary:  #C9A84C;  /* Dourado — prestígio jurídico */

  /* Neutros */
  --color-bg:         #F8F7F4;  /* Off-white creme */
  --color-surface:    #FFFFFF;
  --color-border:     #E2DDD5;
  --color-text:       #1A1A2E;
  --color-muted:      #6B7280;

  /* Semânticas */
  --color-success:    #0F7A5A;
  --color-warning:    #B45309;
  --color-error:      #DC2626;

  /* Status dos documentos */
  --status-pending:   #D97706;  /* Âmbar — aguardando */
  --status-signed:    #2563EB;  /* Azul — parcialmente assinado */
  --status-complete:  #059669;  /* Verde — concluído */
}
```

**Tipografia sugerida:**
```css
/* Display / Títulos */
font-family: 'Playfair Display', serif;

/* Interface / Corpo */
font-family: 'DM Sans', sans-serif;

/* Código / Hashes */
font-family: 'JetBrains Mono', monospace;
```

### Componentes de UI Essenciais

- `Button` — variantes: `primary`, `secondary`, `ghost`, `danger`
- `StatusBadge` — cores por status do documento
- `DocumentCard` — card com preview, status e ações
- `SigningStep` — indicador de progresso do wizard
- `PdfViewer` — wrapper do `react-pdf` com controles
- `SelfieCapture` — toggle upload/câmera com preview
- `Alert` — feedback de sucesso, erro, informação
- `Modal` — confirmações e detalhes

---

## Plano de Desenvolvimento por Etapas

### Etapa 1 — Migrations e Models do Laravel
> Base do banco de dados com relacionamentos, casts e mutators

- [ ] Migration: `users`
- [ ] Migration: `clients`
- [ ] Migration: `certificates`
- [ ] Migration: `documents`
- [ ] Migration: `signatures`
- [ ] Model `User` com relacionamentos
- [ ] Model `Client`
- [ ] Model `Certificate` com cast para descriptografar senha
- [ ] Model `Document` com escopos de status
- [ ] Model `Signature`

---

### Etapa 2 — Upload de Documento e Geração de Link
> Controller, validação, storage e envio de notificação

- [ ] `DocumentController::store` — upload + criação do registro
- [ ] Geração de `signing_token` (UUID v4)
- [ ] Armazenamento do PDF no S3/disco
- [ ] Cálculo do `original_hash` (SHA-256)
- [ ] `SendSigningLink` Job — envio de e-mail com o link
- [ ] Template de e-mail HTML para o cliente
- [ ] `DocumentController::index` — listagem com filtros

---

### Etapa 3 — Certificado A1 e Assinatura PAdES
> O núcleo técnico e jurídico do sistema

- [ ] `CertificateController::store` — upload e validação do `.pfx`
- [ ] `CertificateService` — extração de metadados, criptografia da senha
- [ ] `ManifestService` — geração da página de auditoria com TCPDF
- [ ] `PdfSignerService` — fusão FPDI + assinatura PAdES OpenSSL
- [ ] `SignatureController::signAsLawyer` — orquestra o processo completo
- [ ] Cálculo do `final_hash` e atualização do status
- [ ] Envio do PDF final para ambas as partes

---

### Etapa 4 — Frontend React
> Dashboard do advogado e área pública do cliente

- [ ] Setup do projeto Vite + Tailwind + Zustand
- [ ] Configuração do Axios com interceptors de autenticação
- [ ] Layout base com sidebar de navegação
- [ ] Página `DocumentList` com tabela e filtros
- [ ] Página `NewDocument` com upload de PDF e form de cliente
- [ ] Página `DocumentDetail` com evidências e ação de assinar
- [ ] Página `CertificateSettings`
- [ ] Rota pública `/sign/:token` — wizard de assinatura do cliente
- [ ] Componente `PdfViewer`
- [ ] Componente `SelfieCapture`
- [ ] Telas de loading, erro e sucesso

---

## Segurança

### Checklist de Segurança

| Item | Implementação |
|------|--------------|
| Autenticação | Laravel Sanctum (tokens stateless) |
| Autorização | Policies do Laravel (Gate) |
| Certificado A1 | Armazenado fora do `public/`, senha criptografada AES-256 |
| Tokens de link | UUID v4, expiração configurável, uso único |
| Upload de arquivos | Validação de MIME type + extensão + tamanho máximo |
| SQL Injection | Eloquent ORM (queries parametrizadas) |
| XSS | React (escaping automático) + CSP headers |
| CSRF | Sanctum tokens nos headers |
| HTTPS | Obrigatório em produção (Let's Encrypt) |
| Logs | Nunca logar senhas, hashes de chave privada ou PII |
| Rate Limiting | Laravel throttle nos endpoints públicos |
| Selfies/PDFs | Acesso via URLs assinadas (S3 Presigned URLs) |

### Armazenamento do Certificado A1

```
NUNCA armazenar em:
  ✗ Variáveis de ambiente em texto plano
  ✗ Diretório public/ do servidor
  ✗ Git/repositório de código
  ✗ Logs da aplicação

ARMAZENAR em:
  ✓ Disco privado do Laravel (storage/app/certificates/)
  ✓ Senha criptografada no banco com encrypt() do Laravel
  ✓ Opcionalmente: AWS Secrets Manager ou HashiCorp Vault
```

---

## Deploy e Infraestrutura

### Docker Compose (Desenvolvimento)

```yaml
services:
  nginx:
    image: nginx:alpine
    ports: ["80:80", "443:443"]
    depends_on: [api, web]

  api:
    build: ./docker/php
    volumes: ["./apps/api:/var/www/html"]
    environment:
      - APP_ENV=local
    depends_on: [postgres, redis]

  web:
    build: ./apps/web
    ports: ["5173:5173"]

  postgres:
    image: postgres:16-alpine
    volumes: [postgres_data:/var/lib/postgresql/data]
    environment:
      POSTGRES_DB: assinatura_db

  redis:
    image: redis:7-alpine

volumes:
  postgres_data:
```

### Considerações para Produção

- [ ] Configurar HTTPS com certificado TLS válido
- [ ] Habilitar backups automáticos do PostgreSQL
- [ ] Configurar monitoramento de logs (ex: Sentry)
- [ ] Definir política de retenção de documentos
- [ ] Auditar conformidade com a LGPD (Lei 13.709/2018) para dados pessoais coletados
- [ ] Configurar alertas de expiração dos Certificados A1

---

## Referências Legais

- **MP 2.200-2/2001** — Institui a Infraestrutura de Chaves Públicas Brasileira (ICP-Brasil)
- **Lei 14.063/2020** — Define os tipos de assinatura eletrônica para atos com a administração pública e entre particulares
- **LGPD — Lei 13.709/2018** — Proteção de dados pessoais (selfies, CPFs, IPs, geolocalizações)
- **Resolução CNJ nº 335/2020** — Plataforma Digital do Poder Judiciário Brasileiro (PDPJ-Br)

---

*Blueprint gerado em 2026-03-17 — versão 1.0*
