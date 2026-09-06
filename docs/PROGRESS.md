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

## PARTE 6–8 — Projetor, qualidade, deploy

- [ ] PARTE 6 — Modo Projetor (`/screen/:code`) + formulário de pré-aula
- [ ] PARTE 7 — Qualidade, segurança e experiência
- [ ] PARTE 8 — Deploy
