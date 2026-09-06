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
