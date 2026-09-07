# Progresso

Checklist por parte. Marque `[x]` ao concluir com testes/critérios verificados.

## PARTE 1 — Fundação do monorepo e modelo de dados ✅

- [x] `package.json` raiz com npm workspaces e scripts `dev/build/test/lint`
- [x] `/shared`: tipos `room`/`moment`/`events`, enums, schemas Zod, contrato Socket.IO
- [x] `/backend`: Prisma schema (10 modelos), migration inicial, `seed.ts`
- [x] `/frontend`: scaffold mínimo que passa lint/build/test
- [x] Infra: `docker-compose.yml`, `.env.example`, README (5 comandos)
- [x] `docs/DECISIONS.md` e `docs/PROGRESS.md`
- [x] **Critérios de aceite:** `npm install`, `build -w shared`, `prisma migrate`+`seed`, `lint`, `test` OK

## PARTE 2 — Backend: autenticação, lições e salas (HTTP) ✅

- [x] Auth do professor (register/login/me, JWT, bcrypt, rate-limit)
- [x] CRUD de lições e momentos (+ reorder, duplicate)
- [x] Salas (criar, pública, encerrar, relatório JSON/CSV)
- [x] Pré-aula (Just-in-Time Teaching)
- [x] Testes Supertest do fluxo completo (15 testes)
- [x] **Critérios de aceite:** testes passam; `curl` documentado no README funciona com o seed

## PARTE 3 — Backend: tempo real (Socket.IO) e motor de momentos ✅

- [x] `RoomStateManager` (memória + write-through + reconstrução do banco)
- [x] Fluxo do aluno (join com apelido único/reconexão, answer, wall post/upvote)
- [x] Fluxo do professor (assignTeams, startMoment, advancePhase, timer, close, approveAnswer)
- [x] Agregadores puros por tipo (+ 10 testes unitários)
- [x] Robustez (try/catch → error ao remetente, limite 200, sanitização, throttle)
- [x] Testes de integração (Peer Instruction + Quiz + reconexão) — 3 testes
- [x] **Critérios de aceite:** ciclo completo de PEER_INSTRUCTION e QUIZ_TEAM verificados; reconexão recupera respostas

## PARTE 4 — Frontend: base, design system e entrada do aluno ✅

- [x] Tailwind + tokens (CSS vars, modo escuro), roteamento das 9 rotas
- [x] Design system `src/ui/` (Button, Card, Input, OptionButton, ProgressDots, Badge, Timer, Toast, EmptyState)
- [x] Camada de dados (api/client, api/hooks TanStack Query, realtime/socket, store Zustand)
- [x] Fluxo do aluno: /join (validação + sessionStorage), /room (MomentRenderer, espera, reconexão)
- [x] Componentes de resposta por tipo + WallPanel + feedback individual do quiz
- [x] Testes RTL (OptionButton, PeerInstructionAnswer fases, Join) — 12 testes
- [x] **Critérios de aceite:** aluno entra, vê espera, responde e vê confirmação; acessibilidade AA (foco, aria-live, labels)

## PARTE 5 — Painel do professor (editor + ao vivo) ✅

- [x] Login + Dashboard (lições, Editar/Duplicar/Iniciar aula)
- [x] Editor de roteiro (cabeçalho, dnd-kit, modal 9 tipos, formulários Zod, modelos, QR pré-aula)
- [x] Painel ao vivo (3 colunas/abas, fases, contador, prévia de resultados, REEXPLAIN, moderação, timer, encerrar)
- [x] Relatório pós-aula (participação, ganho Peer Instruction em gráfico, reflexões, export CSV, dúvidas)
- [x] Backend: `GET /rooms/:code`, moderação host-only, evento `host:markWall`
- [x] Code splitting das rotas do professor (bundle do aluno ~103 kB gzip)
- [x] Testes RTL (reorderIds, MomentForm, ControlColumn avanço de fase) — 8 novos
- [x] **Critérios de aceite:** editor add/reorder e painel de fase testados; ciclo Peer Instruction com dois gráficos (ResultsPreview)

## PARTE 6 — Modo Projetor (`/screen/:code`) + pré-aula ✅

- [x] `screen:join` público (espectador passivo, sem virar participante)
- [x] Tela pública dark: código + QR, participantes, timer, placar; atalho F fullscreen
- [x] Renderers por tipo (Poll, PeerInstruction com fases, WordCloud, Open/Reflection, Quiz+pódio, VerseHighlight heatmap, Wall, Timer)
- [x] Transições com framer-motion; reconexão automática do socket
- [x] `scripts/simulate-students.ts` (N sockets aleatórios)
- [x] Formulário de pré-aula (`/preclass/:token`)
- [x] **Critérios de aceite:** projetor reflete a fase em ~8 ms (< 500 ms, verificado); nenhum dado individual sem aprovação (distribuição oculta em VOTE_1/2)

## PARTE 7 — Qualidade, segurança e experiência ✅

- [x] E2E Playwright (aula completa: professor + 2 alunos + projetor) + CI (`.github/workflows/ci.yml`: lint, unit, e2e)
- [x] Segurança: Helmet, CORS restrito, rate-limit socket (`room:join`, `wall:post`), sanitização, código expira 6h, JWT 7d
- [x] Upgrade Fastify 5 + @fastify/jwt 10 → produção sem vulnerabilidades high/critical (`npm audit --omit=dev`)
- [x] Resiliência: reconexão + banner, re-join automático, "Reabrir última aula"
- [x] Offline-tolerante: fila de respostas reenviada ao reconectar (idempotente)
- [x] PWA: manifest + service worker + registro
- [x] Onboarding: tour de 4 passos (próprio)
- [x] Docs: `docs/GUIA-DO-PROFESSOR.md`
- [x] **Critérios de aceite:** bundle do aluno < 200 kB gzip (~103); prod sem high/critical (dev-tooling vite/vitest rastreado em ROADMAP)

## PARTE 8 — Deploy ✅

- [x] Dockerfiles multi-stage (backend Node+Prisma→Postgres; frontend Vite→nginx com SPA + proxy /api,/socket.io)
- [x] `docker-compose.prod.yml` (postgres + backend + frontend + Caddy HTTPS)
- [x] Alternativa sem Docker documentada (Vercel/Netlify + Railway/Render + Neon/Supabase)
- [x] `npm run deploy:check` (valida env + conexão ao banco) — verificado
- [x] README: diagrama Mermaid, variáveis, comandos, backup/restore, criar 1º professor (`create-teacher`)
- [x] **Critérios de aceite:** compose escrito para subir tudo e servir em https://localhost (build não executável nesta sessão — sem daemon Docker)

## PARTE 10 — Leitura Diária, WhatsApp e autenticação por número ✅

- [x] Modelo de dados estendido (`Teacher` = entidade Usuário: `whatsappNumber`, `role`, `isActive`), `OtpCode`, `DailyReading`, `WhatsAppSubscription`, `WhatsAppMessage`; migration `part10_whatsapp_daily_reading`
- [x] Normalização E.164 (`libphonenumber-js`, região BR) + mascaramento (`maskPhone`) — o mesmo número nunca vira dois usuários
- [x] Autenticação por número via **OTP** (6 dígitos, **só hash bcrypt**, expira em 5 min, rate-limit por número, máx. 5 tentativas)
- [x] Abstração de provedor WhatsApp (`WhatsAppProvider`) com **Mock** (dev/test) e **Cloud** (Graph API) — sem WhatsApp Web/Puppeteer/Selenium/QR pessoal
- [x] Leitura Diária: professor cadastra (título, versículo, referência, data, mensagem opcional, status DRAFT/PUBLISHED/SENT)
- [x] Geração de arte 1080×1080 no servidor (SVG → PNG via `sharp`) obedecendo a identidade El Shaday; endpoints de arte **públicos** (só o id, sem dado privado)
- [x] Envio por WhatsApp (manual + agendado via job de 60 s) com **deduplicação** (`@@unique(dailyReadingId, userId, type)`) e **registro de falhas**
- [x] Privacidade: número nunca exibido público/no projetor/em relatórios; opt-in/opt-out por `WhatsAppSubscription`; tokens só no backend
- [x] Frontend: login por WhatsApp (2 passos), painel de Leitura Diária (dashboard + editor + preview + baixar/enviar), página de Perfil (número mascarado + preferência)
- [x] Entrada anônima do aluno (código + apelido) **preservada** (PARTE 10.17 — sem cadastro); login por e-mail/senha do professor intacto
- [x] Testes (backend +15: phone, OTP, leitura diária, arte, envio/idempotência/falha/opt-out, job agendado) + E2E (`e2e/part10.spec.ts`); lint/build/test verdes
- [x] **Critérios de aceite:** OTP só hash + expira + rate-limit; E.164; arte 1080×1080 com título/versículo/referência na identidade visual; envio manual e agendado; duplicidade impedida; falhas registradas; número nunca público; docs atualizadas
