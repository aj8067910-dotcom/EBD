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
