# Deploy no Render (passo a passo)

Guia para colocar o **Koinonia Class** no ar usando o [Render](https://render.com)
para a **API (backend)** e o **site (frontend)**, com o **banco de dados no
[Neon](https://neon.tech)** (Postgres grátis que **não expira em 30 dias** como
o banco grátis do Render).

O repositório traz um **Blueprint** (`render.yaml`) que sobe os dois serviços do
Render de uma vez. Você preenche, depois do 1º deploy, a **DATABASE_URL** (Neon),
as **URLs finais** e o **login de administrador**.

---

## Pré-requisitos

- Conta no Render (você já tem).
- Este repositório conectado ao seu GitHub (o Render lê o `render.yaml` dele).
- Uma conta no Neon (grátis) para o banco de dados.

---

## Passo 0 — Criar o banco no Neon

1. Acesse [neon.tech](https://neon.tech) e crie uma conta (pode entrar com o
   GitHub).
2. Crie um **Project** (região mais próxima, ex.: *AWS São Paulo* ou *US East*).
3. Copie a **Connection string** (formato
   `postgresql://usuario:senha@host/neondb?sslmode=require`). Guarde — é a sua
   `DATABASE_URL`.

> O Neon "hiberna" o banco quando ocioso e acorda sozinho na 1ª conexão — sem
> custo e sem expirar em 30 dias.

---

## Passo 1 — Criar os serviços pelo Blueprint

1. No Render, clique em **New +** → **Blueprint**.
2. Selecione este repositório e a branch de deploy.
3. O Render lê o `render.yaml` e mostra os serviços que vai criar:
   - `koinonia-api` (backend, Docker)
   - `koinonia-web` (frontend, site estático)
4. Confirme (**Apply**). O `JWT_SECRET` é gerado automaticamente.
5. Ele vai pedir os valores marcados como *sync: false* (incluindo a
   `DATABASE_URL` do Passo 0). Pode preencher agora ou no Passo 3.

> ⏱️ O primeiro build leva alguns minutos (compila backend e frontend).

---

## Passo 2 — Anotar as duas URLs

Quando os serviços ficarem *Live*, copie as URLs públicas (ficam no topo de cada
serviço), algo como:

| Serviço | URL (exemplo) |
|---|---|
| `koinonia-api` (backend) | `https://koinonia-api-xxxx.onrender.com` |
| `koinonia-web` (site) | `https://koinonia-web-xxxx.onrender.com` |

---

## Passo 3 — Preencher as variáveis e refazer o deploy

### No serviço **koinonia-api** → aba **Environment**

| Variável | Valor |
|---|---|
| `DATABASE_URL` | a *connection string* do **Neon** (Passo 0) |
| `PUBLIC_BASE_URL` | a URL do **backend** (koinonia-api) |
| `CORS_ORIGIN` | a URL do **site** (koinonia-web) |
| `ADMIN_EMAIL` | o seu e-mail de admin (ex.: `voce@suaigreja.com.br`) |
| `ADMIN_PASSWORD` | uma senha forte (mín. 8 caracteres) |
| `ADMIN_NAME` | seu nome (ex.: `Pastor João`) |

Salve → **Manual Deploy** → *Deploy latest commit*.

### No serviço **koinonia-web** → aba **Environment**

| Variável | Valor |
|---|---|
| `VITE_API_URL` | a URL do **backend** (koinonia-api) |
| `VITE_WS_URL` | a URL do **backend** (koinonia-api) |

Salve → **Manual Deploy** → *Clear build cache & deploy* (o Vite injeta essas
variáveis **no build**, por isso é preciso rebuildar).

---

## Passo 4 — Entrar como administrador

1. Abra a URL do **site** (koinonia-web) → `/teacher/login`.
2. Entre com o `ADMIN_EMAIL` e a `ADMIN_PASSWORD` que você definiu.

Pronto — você está no painel do professor/admin. 🎉

---

## Observações importantes (plano grátis)

- **Cold start:** o backend grátis "hiberna" após ~15 min sem uso e acorda em
  ~30–60 s no primeiro acesso. Dica: abra o app 1 min antes da aula para
  "acordar" o servidor. Sem impacto real para uma EBD.
- **Capacidade:** o plano grátis roda com folga uma aula de 9–dezenas de alunos
  simultâneos (o app suporta até 200 por sala). Para tirar a hibernação e ganhar
  margem, faça upgrade do backend (a partir de US$ 7/mês) — sem mexer no código.
- **Banco (Neon):** o banco grátis do Neon **não expira em 30 dias** (ao
  contrário do Postgres grátis do Render). Ainda assim, faça **backups**
  periódicos. O Neon autossuspende quando ocioso e reconecta sozinho.
- **WhatsApp:** o app sobe em modo `mock` (simula o envio e registra o código no
  log do serviço). Para envio real, configure a **API Oficial do WhatsApp**
  (Meta Cloud API) e troque `WHATSAPP_PROVIDER` para `cloud`, preenchendo
  `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` etc. (veja `.env.example`).

---

## Domínio próprio (opcional)

Em cada serviço, aba **Settings → Custom Domains**, adicione seu domínio e
aponte o DNS conforme o Render indicar. Depois atualize `CORS_ORIGIN`,
`PUBLIC_BASE_URL`, `VITE_API_URL` e `VITE_WS_URL` para os domínios finais e
refaça o deploy dos dois serviços.
