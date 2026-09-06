# Koinonia Class

Aplicativo web colaborativo para aulas de **Escola Bíblica Dominical (EBD)**.
O professor projeta uma tela na sala; os alunos participam pelo celular entrando
em uma **sala com código de 6 caracteres**, sem cadastro. O professor dispara
"momentos" (atividades) em tempo real e os resultados aparecem no projetor
instantaneamente.

Fundamentação pedagógica: Peer Instruction (Mazur), Think-Pair-Share (Lyman),
Just-in-Time Teaching, gamificação por Teoria da Autodeterminação, retrieval
practice e aprendizagem dialógica (Freire).

## Arquitetura (monorepo — npm workspaces)

```
/
├── shared     → tipos TypeScript + schemas Zod (eventos de socket, DTOs)
├── backend    → Node 20 + TypeScript + Fastify + Socket.IO + Prisma + PostgreSQL (SQLite em dev)
├── frontend   → React 18 + Vite + TypeScript + Tailwind + Zustand + socket.io-client + Recharts
├── docker-compose.yml
└── .env.example
```

## Instalação (5 comandos)

```bash
# 1. Instalar dependências de todos os workspaces
npm install

# 2. Configurar variáveis de ambiente
cp .env.example backend/.env    # ajuste JWT_SECRET; DATABASE_URL já usa SQLite em dev

# 3. Compilar os tipos compartilhados
npm run build -w shared

# 4. Criar o banco de dados e popular com dados de exemplo
npm run prisma:migrate -w backend && npm run prisma:seed -w backend

# 5. Rodar backend + frontend em modo desenvolvimento
npm run dev
```

O backend sobe em `http://localhost:3333` e o frontend em `http://localhost:5173`.

### Professor demo (após o seed)

- E-mail: `professor@koinonia.dev`
- Senha: `demo1234`

## Scripts úteis (na raiz)

| Comando | Descrição |
|---|---|
| `npm run build` | Compila `shared`, `backend` e `frontend` |
| `npm run dev` | Sobe backend e frontend em paralelo |
| `npm run test` | Roda os testes dos três pacotes |
| `npm run lint` | Lint nos três pacotes |
| `npm run format` | Formata com Prettier |

## API REST — exemplos com `curl`

Com o backend rodando (`npm run dev -w backend`) e o banco populado pelo seed,
o fluxo completo funciona assim (professor demo):

```bash
BASE=http://localhost:3333

# 1. Login (retorna JWT em cookie httpOnly e no corpo)
TOKEN=$(curl -s -X POST $BASE/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"professor@koinonia.dev","password":"demo1234"}' \
  | node -pe 'JSON.parse(require("fs").readFileSync(0)).token')

# 2. Dados do professor autenticado
curl -s $BASE/auth/me -H "Authorization: Bearer $TOKEN"

# 3. Listar lições
curl -s $BASE/lessons -H "Authorization: Bearer $TOKEN"

# 4. Criar uma sala para a primeira lição
LID=$(curl -s $BASE/lessons -H "Authorization: Bearer $TOKEN" \
  | node -pe 'JSON.parse(require("fs").readFileSync(0)).lessons[0].id')
ROOM=$(curl -s -X POST $BASE/rooms -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d "{\"lessonId\":\"$LID\"}")
echo "$ROOM"          # { "room": { "code": "XXXXXX", ... } }

# 5. Info pública da sala (sem auth — usada pela tela de entrada do aluno)
CODE=$(echo "$ROOM" | node -pe 'JSON.parse(require("fs").readFileSync(0)).room.code')
curl -s $BASE/rooms/$CODE/public

# 6. Encerrar a sala e gerar relatório
curl -s -X POST $BASE/rooms/$CODE/end -H "Authorization: Bearer $TOKEN"
RID=$(echo "$ROOM" | node -pe 'JSON.parse(require("fs").readFileSync(0)).room.id')
curl -s $BASE/rooms/$RID/report -H "Authorization: Bearer $TOKEN"
curl -s $BASE/rooms/$RID/report.csv -H "Authorization: Bearer $TOKEN"
```

Rotas principais:

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| POST | `/auth/register` `/auth/login` | — | Cadastro/login do professor (JWT) |
| GET | `/auth/me` | ✅ | Professor autenticado |
| GET/POST | `/lessons` | ✅ | Listar / criar lições |
| GET/PUT/DELETE | `/lessons/:id` | ✅ | Detalhe / editar / excluir |
| POST | `/lessons/:id/duplicate` | ✅ | Duplicar roteiro |
| POST | `/lessons/:id/moments` | ✅ | Adicionar momento |
| PUT/DELETE | `/moments/:id` | ✅ | Editar / excluir momento |
| PATCH | `/lessons/:id/moments/reorder` | ✅ | Reordenar momentos |
| POST | `/rooms` | ✅ | Criar sala (código 6 chars) |
| GET | `/rooms/:code/public` | — | Info pública da sala |
| POST | `/rooms/:code/end` | ✅ | Encerrar sala |
| GET | `/rooms/:id/report(.csv)` | ✅ | Relatório consolidado |
| GET/POST | `/lessons/:id/preclass?token=…` | — | Pré-aula (link público) |
| GET | `/lessons/:id/preclass/summary` | ✅ | Resumo da pré-aula |

## Banco de dados

Em desenvolvimento usamos **SQLite** (`backend/prisma/dev.db`). Para produção,
altere o `provider` em `backend/prisma/schema.prisma` para `postgresql`, aponte
`DATABASE_URL` para o Postgres (veja `docker-compose.yml`) e rode as migrations.

```bash
docker compose up -d   # sobe um PostgreSQL 16 local
```

## Progresso

Este projeto é construído em partes; veja `docs/PROGRESS.md` para o checklist e
`docs/DECISIONS.md` para as decisões técnicas.
