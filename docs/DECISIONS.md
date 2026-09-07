# Decisões Técnicas

Registro cronológico das decisões de arquitetura e ferramentas.

## PARTE 1 — Fundação do monorepo e modelo de dados

- **Monorepo com npm workspaces** (`shared`, `backend`, `frontend`) na raiz do
  repositório, em vez de um subdiretório `koinonia-class/` — o repositório já é
  o projeto.
- **Módulos ESM** (`"type": "module"`) em todos os pacotes, para alinhar com Vite
  e com a stack moderna de TypeScript.
- **`@koinonia/shared`** exporta tipos e schemas Zod. Consumido pelos outros
  pacotes via alias para o código-fonte em desenvolvimento/testes
  (Vite/Vitest `resolve.alias`) e via `dist/` (build `tsc`) para produção. Isso
  evita a necessidade de recompilar `shared` a cada teste.
- **Enums como objetos `as const`** no `shared` (`MomentType`, `MomentPhase`,
  `RoomStatus`) em vez de `enum` do TS, para melhor tree-shaking e interop com
  Zod (`z.nativeEnum`).
- **DTOs como discriminated unions do Zod** (`CreateMomentDTO`, `SubmitAnswerDTO`)
  chaveadas por `type`, garantindo que cada tipo de momento valide seu próprio
  `config`/payload.
- **Prisma com provider SQLite em dev**. O SQLite não suporta enums nativos no
  Prisma, então `type`, `status` e `phase` são `String` validados na aplicação
  pelos schemas Zod do `shared`. Para produção troca-se o provider para
  `postgresql`.
- **Código de sala** com alfabeto sem ambiguidade (`ABCDEFGHJKMNPQRSTUVWXYZ23456789`,
  sem 0/O e 1/I/L), 6 caracteres — definido no `shared` para validação idêntica
  no cliente e no servidor.
- **bcryptjs** (em vez de `bcrypt` nativo) para evitar compilação nativa no
  ambiente; suporta o custo 12 exigido.
- **Carregamento de `.env`** via `process.loadEnvFile()` (Node ≥ 20.6) sem
  dependência extra de `dotenv`.

## PARTE 2 — Backend: autenticação, lições e salas (HTTP)

- **Arquitetura em camadas** `routes/ → controllers/ → services/ →
  repositories/`. Controllers validam entrada com Zod (schemas do `shared` +
  schemas locais de request), services concentram regra de negócio e checagem
  de propriedade (`teacherId`), repositories encapsulam Prisma.
- **Erros centralizados** em `plugins/errorHandler.ts` — `AppError` (código +
  status), `ZodError` e erros de rate-limit/JWT viram sempre
  `{ error: { code, message } }`.
- **JWT com `@fastify/jwt` + `@fastify/cookie`**: token entregue tanto em cookie
  httpOnly quanto no corpo (Bearer). `requireTeacher` decorado na instância lê
  de qualquer um dos dois. Expiração de 7 dias.
- **bcrypt custo 12** em `authService` (via `bcryptjs`).
- **Rate limit por rota** (`@fastify/rate-limit` com `global: false`) — 10/min no
  login; reaproveitável em `room:join`/`wall:post` na PARTE 7.
- **`config` de momento como texto JSON** validado por tipo com
  `momentConfigByType` (Zod do `shared`) em `lib/moment.ts`; `toMomentDTO` faz o
  parse de volta ao ler. `correctOptionIds` idem.
- **Token de pré-aula** = campo `preClassToken` (cuid) na `Lesson`, passado por
  query (`?token=`) nas rotas públicas de pré-aula — sem expor gabarito.
- **Testes com Supertest** contra `app.server` (Fastify), banco SQLite de teste
  isolado (`prisma db push` em `globalSetup`, `NODE_ENV=test` evita sobrescrever
  `DATABASE_URL`), execução sequencial (`fileParallelism: false`).
- **Relatório** consolidado (JSON e CSV) montado a partir das tabelas; % de
  acerto antes/depois em PEER_INSTRUCTION calculado das fases `OPEN`/`REOPEN`.

## PARTE 3 — Backend: tempo real (Socket.IO) e motor de momentos

- **Socket.IO acoplado ao servidor HTTP do Fastify** (`attachRealtime`) no
  namespace `/room`. Chamado em `server.ts` (não em `buildApp`), para que os
  testes HTTP com Supertest fiquem isolados do WebSocket e os testes de tempo
  real anexem explicitamente.
- **Autenticação**: host via JWT no handshake (`auth.token` + `auth.code`,
  validado com `app.jwt.verify`, checando `room.teacherId`); aluno entra por
  `room:join { code, nickname }` sem token.
- **`RoomStateManager`**: estado autoritativo em memória (`Map<code, RoomRuntime>`),
  reconstruído do banco em `getOrLoad` (sobrevive a restart). Respostas são
  **write-through** (persistidas imediatamente com upsert em
  `@@unique(momentId, participantId, phase)`), então a reconexão pelo mesmo
  apelido (janela de 30 min) recupera as respostas sem estado extra.
- **Fases de resposta do quiz** codificadas como `Q:<questionId>` para respeitar
  o unique por fase com múltiplas perguntas no mesmo momento.
- **Máquina de estados por tipo** em `advancePhase`: PEER_INSTRUCTION
  `OPEN→DISCUSS(timer 150s)→REOPEN→REVEALED` (com `suggestion: 'REEXPLAIN'` se
  acerto inicial < 30%); QUIZ_TEAM avança questão a questão com timer e placar
  por equipe (bônus de velocidade linear até +50%, calculado no servidor);
  demais tipos `OPEN→CLOSED→REVEALED` (ou `OPEN→CLOSED` para aberto/reflexão).
- **Só agregados aos alunos**: `computeResults` lê o banco e devolve apenas
  contagens/nuvem/heatmap/cards aprovados; o `correctId` do quiz nunca vai ao
  cliente (`publicConfig` expõe só a questão atual sem gabarito).
- **Robustez**: todo handler em try/catch emitindo `error` apenas ao remetente;
  limite de 200 participantes; sanitização de texto (`stripHtml` + limite);
  broadcasts de resultados com throttle de 200 ms (≤ 5/s por sala).
- **Agregadores puros** em `realtime/aggregators/` com testes unitários; testes
  de integração com 2 sockets cobrem o ciclo de PEER_INSTRUCTION, o QUIZ_TEAM e
  a reconexão do aluno.

## PARTE 4 — Frontend: base, design system e entrada do aluno

- **Tailwind com tokens em CSS variables** (`:root` claro + `.dark` para o
  projetor). Cores mapeadas no `tailwind.config.js` via `var(--…)` (brand
  índigo, accent dourado). Foco visível AA global e `prefers-reduced-motion`.
- **Design system** em `src/ui/` (`Button`, `Card`, `Input`, `OptionButton`
  ≥56px com letra A/B/C/D e barra de cor da equipe, `ProgressDots`, `Badge`,
  `Timer` com anel SVG, `ToastProvider`/`useToast`, `EmptyState`), com
  `aria-live`/`aria-pressed`/labels.
- **Camada de dados**: `api/client.ts` (fetch com `ApiError` padronizado e token
  em `localStorage`), `api/hooks.ts` (TanStack Query — `usePublicRoom`),
  `realtime/socket.ts` (singleton tipado com os contratos do `shared`,
  reconexão automática) e store Zustand `useRoomStore` atualizado **apenas** por
  eventos de socket.
- **Feedback individual do quiz**: o ack de `moment:answer` passou a devolver
  `isCorrect` **somente ao aluno que respondeu** (o `correctId` nunca é
  transmitido), permitindo o feedback certo/errado sem enviesar os demais.
- **Fluxo do aluno**: `/join/:code?` (código auto-uppercase filtrado pelo
  alfabeto do `shared`, validado via `/rooms/:code/public`, apelido 2–20,
  persistência em `sessionStorage`), `/room/:code` com `MomentRenderer` (switch
  por tipo), estado de espera, banner “Reconectando…”, re-join automático no
  evento `connect`, e `WallPanel` flutuante sempre visível.
- **Componentes de resposta** por tipo em `src/moments/student/`; rotas de
  professor/projetor ficam como `Placeholder` até as PARTES 5–6.
- **Testes RTL**: `OptionButton`, fases do `PeerInstructionAnswer`, validação do
  `Join` (fetch mockado) e roteamento da landing — 12 testes.

## PARTE 5 — Frontend: painel do professor (editor + ao vivo)

- **Adição no backend**: `GET /rooms/:code` (autenticado, dono) devolve sala +
  lição com momentos, para o painel ao vivo carregar o roteiro ao abrir por URL.
- **Hooks TanStack Query** (`api/teacherHooks.ts`) para auth, lições, momentos
  (CRUD + reorder), salas e relatório; token JWT em `localStorage` (Bearer).
- **Editor de roteiro**: cabeçalho com salvamento no `onBlur`; lista arrastável
  com `@dnd-kit`; a lógica de reordenação foi extraída para `reorderIds` (puro e
  testável); modal de adição com os 9 tipos do `momentCatalog`; `MomentForm` por
  tipo validado com o **schema Zod do `shared`** (`createMomentSchema`) no
  submit; modelos de aula em `templates/lessonTemplates.ts`; link de pré-aula
  com QR (`qrcode.react`).
- **Painel ao vivo**: `connectHost(token, code)` abre um socket host (JWT no
  handshake); 3 colunas no desktop / abas no mobile; controle de fase contextual
  por tipo; alerta REEXPLAIN; prévia de resultados com Recharts
  (`ResultsPreview`, dois gráficos no Peer Instruction); timer rápido; encerrar
  aula (REST) → relatório.
- **Moderação sem vazamento**: o backend passou a rastrear sockets de host por
  sala (`hostSocketIds`) e envia as respostas **não aprovadas** apenas aos hosts
  (`computeResults({ includeUnapproved })`), mantendo a regra de só exibir
  aprovadas aos alunos/projetor.
- **Novo evento** `host:markWall` (marcar respondida / exibir no projetor),
  adicionado ao contrato compartilhado e ao backend.
- **Code splitting**: páginas do professor via `React.lazy` — Recharts/dnd-kit/
  react-hook-form/qrcode saem para chunks separados; o bundle do aluno volta a
  ~103 kB gzip (meta da PARTE 7).
- **Testes**: `reorderIds`, `MomentForm` (draft válido + erro de validação) e
  `ControlColumn` (avanço de fase + alerta REEXPLAIN) — 8 testes novos.

## PARTE 6 — Frontend: modo projetor (`/screen/:code`) e pré-aula

- **Evento `screen:join`** (público) no contrato: o projetor entra na sala
  Socket.IO como **espectador passivo** — sem criar `Participant` (contagem de
  alunos permanece correta) — e recebe `room:state`/`moment:updated`/results/
  timer/scores/wall. Verificado end-to-end: fase refletida em ~8 ms (< 500 ms).
- **`connectScreen(code)`** no cliente: socket sem auth, re-emite `screen:join`
  no `connect` (reconexão automática sem recarregar).
- **Tema escuro** aplicado via classe `.dark` no `<html>` só na rota do projetor;
  atalho `F` para fullscreen; transições entre momentos/fases com
  `framer-motion` (`AnimatePresence` chaveado por `momentId:phase`).
- **Renderers por tipo** em `moments/screen/`: barras animadas (Poll), Peer
  Instruction que **esconde a distribuição** em VOTE_1/VOTE_2 (só contagem) e
  mostra dois gráficos + ganho em REVEALED, nuvem de palavras, cards aprovados
  (Open/Reflection), quiz com pódio, heatmap do versículo, mural e cronômetro.
- **Privacidade**: nenhum dado individual aparece sem aprovação — cards de
  abertos chegam já filtrados (aprovados) do servidor; a distribuição de votos
  não é exibida antes de revelar (teste em `PeerInstructionScreen.test.tsx`).
- **`scripts/simulate-students.ts`** (`npm run simulate -w backend <CÓDIGO> [n]`):
  conecta N sockets que respondem aleatoriamente, para exercitar o projetor.
- **Formulário de pré-aula** (`/preclass/:token?lesson=…`): busca os momentos de
  pré-aula por token e envia respostas via REST (JiTT).
- **Code splitting**: `Screen` (framer-motion) e `PreClass` em chunks lazy.

## PARTE 7 — Qualidade, segurança e experiência

- **Segurança**: `@fastify/helmet` (cabeçalhos), CORS restrito por `CORS_ORIGIN`,
  rate-limit HTTP no login (10/min) + rate-limit **de socket** (`room:join`
  10/min por IP, `wall:post` 5/10s por participante), sanitização de texto,
  **expiração de código de sala em 6h** (`isRoomExpired`), JWT 7 dias.
- **Upgrade de segurança de dependências**: Fastify 4 → **5** e `@fastify/jwt`
  → **10** (fast-jwt 6.3.3), eliminando os CVEs high/critical em
  fastify/find-my-way/fast-jwt. `npm audit --omit=dev` fica **sem high/critical**
  (restam 2 moderate do react-router, não aplicáveis a esta SPA). Os
  high/critical restantes do `npm audit` completo são **apenas de tooling de
  dev** (vite/vitest, exigem major bump) — rastreados em `docs/ROADMAP.md`.
- **Resiliência**: reconexão exponencial do socket (client), banner
  "Reconectando…", **re-join automático** no `connect`, e **"Reabrir última
  aula"** (professor) via `localStorage`.
- **Offline-tolerante**: respostas do aluno entram em **fila** quando offline e
  são reenviadas no `connect` — idempotentes pelo `@@unique(momentId,
  participantId, phase)`.
- **PWA**: `manifest.webmanifest` + `sw.js` (network-first para navegação,
  cache-first para assets, nunca cacheia `/socket.io`) + registro em produção.
- **Onboarding**: `TeacherTour` próprio (4 passos, flag em `localStorage`).
- **E2E Playwright**: cenário "aula completa" (professor + 2 alunos + projetor)
  dirigindo login → iniciar aula → entrar → word cloud → projetor reflete;
  `webServer` sobe backend (SQLite e2e + seed) e o front (preview). Em CI o
  navegador vem de `playwright install`; local usa `PW_CHROMIUM_PATH`.
- **CI**: `.github/workflows/ci.yml` roda lint + build + unit/integração + e2e.
- **Docs**: `docs/GUIA-DO-PROFESSOR.md`.

## PARTE 8 — Deploy

- **Dockerfiles multi-stage** com contexto no **raiz do monorepo** (para resolver
  o workspace `@koinonia/shared`). Backend: instala deps, **troca o provider do
  Prisma para `postgresql`** via `sed` antes do `prisma generate` (o schema já é
  portável — JSON como texto, enums como string), compila e, no runtime, roda
  `prisma db push` + `node dist/server.js`. Frontend: build Vite → **nginx**
  servindo o SPA com fallback e **proxy** de `/api` (prefixo removido) e
  `/socket.io` (com upgrade WebSocket) para o backend.
- **Same-origin em produção**: o front é buildado com `VITE_API_URL=/api` e
  `VITE_WS_URL=''` (Socket.IO usa a origem atual, path `/socket.io`), tudo
  atrás do nginx/Caddy — sem CORS cross-site.
- **Caddy** faz HTTPS automático (`localhost` via CA local; Let's Encrypt para
  domínio real) e faz reverse-proxy para o nginx do frontend.
- **`prisma db push`** em vez de `migrate deploy` no runtime: as migrations
  commitadas são do dialeto SQLite; `db push` é agnóstico de provider e aplica o
  schema direto no Postgres — pragmático para este porte.
- **`deploy:check`** valida env (DATABASE_URL, JWT_SECRET não-exemplo) e a
  conexão ao banco; **`create-teacher`** provisiona o primeiro professor.
- **Sem Docker**: documentada a via gerenciada (Vercel/Netlify + Railway/Render
  com WebSocket + Neon/Supabase).

## PARTE 10 — Leitura Diária, WhatsApp e autenticação por número

- **Extensão, não renomeação, do modelo**: a tabela `Teacher` passou a ser a
  **entidade Usuário** (campos `email`/`passwordHash` viraram opcionais; foram
  adicionados `whatsappNumber @unique`, `role` `TEACHER`/`STUDENT`, `isActive`,
  `updatedAt`, `lastLoginAt`). Renomear a tabela quebraria todas as relações
  `teacherId` das PARTES 1–8; estender preserva o login por e-mail/senha e todo
  o histórico. Documentado como decisão consciente (REGRA FINAL da PARTE 10).
- **Migração incremental**: novos modelos `OtpCode`, `DailyReading`,
  `WhatsAppSubscription` (opt-in/opt-out por usuário) e `WhatsAppMessage` (log de
  envio) na migration `part10_whatsapp_daily_reading`. Nada das partes
  anteriores foi substituído.
- **Identidade única por número (E.164)**: `lib/phone.ts` normaliza toda entrada
  com `libphonenumber-js` (região padrão `BR`) para E.164 antes de gravar/buscar
  — o mesmo telefone nunca gera dois usuários. `maskPhone` produz a versão
  mascarada (`+55 74 *****-9515`) usada em toda exibição.
- **OTP seguro (10.5/10.18)**: código de 6 dígitos **nunca** é armazenado em texto
  puro — só o **hash bcrypt** (custo 8) fica no banco, com expiração de 5 min,
  invalidação dos códigos anteriores não consumidos, máximo de 5 tentativas e
  **rate-limit por número** (`allow('otp:'+numero', 5, 15min)`) além do
  rate-limit por rota. A verificação usa `bcrypt.compare` e consome o código.
- **Abstração de provedor WhatsApp (10.8)**: interface `WhatsAppProvider`
  (`sendText`/`sendImage`/`sendOtp`) com duas implementações — `Mock` (dev/test,
  guarda o último OTP e mensagens em memória, com `failNext` para testar falhas)
  e `Cloud` (WhatsApp Business/Graph API, POST autenticado). Selecionado por
  `WHATSAPP_PROVIDER`. **Proibido por decisão**: WhatsApp Web automatizado,
  Puppeteer, Selenium, QR de WhatsApp pessoal ou qualquer cliente simulado.
- **Arte gerada no servidor**: `DailyReadingImageService` monta um **SVG** com a
  identidade El Shaday (gradiente vermelho, halftone, estrelas de quatro pontas,
  wordmark, título em caixa-alta, versículo entre aspas, cápsula coral com a
  referência, data) e rasteriza para **PNG 1080×1080** com `sharp`. O SVG (preview
  no navegador) carrega as fontes de marca; o PNG usa fontes do sistema
  (sharp/librsvg) mantendo cores e layout. Textos bíblicos **nunca** são inseridos
  automaticamente — só o que o professor cadastrou (10.13).
- **Endpoints de arte públicos**: `/daily-readings/:id/art.png` (e `.svg`) são
  públicos porque são endereçados por `cuid` e não expõem dado privado — assim o
  WhatsApp/Meta consegue buscar a imagem por URL. O restante da gestão exige
  `requireTeacher`.
- **Envio manual + agendado com deduplicação (10.9/10.16)**: `whatsappMessageService`
  resolve destinatários por audiência (todos/professores/alunos, respeitando o
  opt-out) e envia sequencialmente via `provider.sendImage`, gravando
  `SENT`/`FAILED`. A idempotência vem do `@@unique(dailyReadingId, userId, type)`:
  reenvio pula quem já recebeu. `dailyReadingJob` roda a cada 60 s (`setInterval`
  com `unref`) despachando leituras `PUBLISHED` com `scheduledAt <= now`.
- **Papéis e autorização**: `requireTeacher` (rejeita `role` não-TEACHER) e novo
  `requireUser` (qualquer usuário autenticado, para o perfil). O JWT carrega
  `{ sub, role?, email? }`. Números na allowlist (`TEACHER_WHATSAPP_ALLOWLIST`)
  se auto-registram como TEACHER; os demais como STUDENT.
- **Compatibilidade (10.17)**: a entrada anônima do aluno (código + apelido, sem
  cadastro) e o login por e-mail/senha do professor continuam funcionando sem
  alteração de comportamento — os guards de `authService`/`authController` apenas
  passaram a tratar `email`/`passwordHash` como possivelmente nulos.
