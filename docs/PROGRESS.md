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

## PARTE 2 — Backend: autenticação, lições e salas (HTTP)

- [ ] Auth do professor (register/login/me, JWT, bcrypt, rate-limit)
- [ ] CRUD de lições e momentos (+ reorder, duplicate)
- [ ] Salas (criar, pública, encerrar, relatório JSON/CSV)
- [ ] Pré-aula (Just-in-Time Teaching)
- [ ] Testes Supertest do fluxo completo

## PARTE 3 — Backend: tempo real (Socket.IO) e motor de momentos

- [ ] `RoomStateManager` (memória + write-behind + reconstrução)
- [ ] Fluxo do aluno (join, answer, wall)
- [ ] Fluxo do professor (assignTeams, startMoment, advancePhase, timer, close)
- [ ] Agregadores puros por tipo (+ testes unitários)
- [ ] Robustez (try/catch, limites, sanitização)
- [ ] Testes de integração (Peer Instruction + Quiz + reconexão)

## PARTE 4–8 — Frontend, qualidade, deploy

- [ ] Fora do escopo atual (backend funcional primeiro)
