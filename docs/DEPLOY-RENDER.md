# Deploy no Render (passo a passo)

Guia para colocar o **Koinonia Class** no ar usando o [Render](https://render.com):
banco Postgres + API (backend) + site (frontend), tudo num provedor só.

O repositório já traz um **Blueprint** (`render.yaml`) que cria os três serviços
de uma vez. Você só precisa preencher, depois do 1º deploy, as **URLs finais** e
o **login de administrador**.

---

## Pré-requisitos

- Conta no Render (você já tem).
- Este repositório conectado ao seu GitHub (o Render lê o `render.yaml` dele).

---

## Passo 1 — Criar tudo pelo Blueprint

1. No Render, clique em **New +** → **Blueprint**.
2. Selecione este repositório e a branch (`main` ou a branch de deploy).
3. O Render lê o `render.yaml` e mostra os serviços que vai criar:
   - `koinonia-db` (Postgres)
   - `koinonia-api` (backend, Docker)
   - `koinonia-web` (frontend, site estático)
4. Confirme (**Apply**). O `JWT_SECRET` é gerado automaticamente.
5. Ele vai pedir os valores marcados como *sync: false*. Se quiser, pode deixar
   em branco agora e preencher no Passo 3 — o 1º build sobe mesmo assim.

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

- **Cold start:** serviços grátis "hibernam" após ~15 min sem uso e acordam em
  ~30–60 s no primeiro acesso. Sem impacto real para uma EBD.
- **Banco grátis expira em ~30 dias.** Para uso contínuo, faça upgrade do
  Postgres para um plano pago (a partir de US$ 7/mês) antes de expirar, ou
  exporte/importe os dados. Faça **backups** periódicos (aba do banco → *Backups*
  ou `pg_dump`).
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
