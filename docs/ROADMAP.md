# Roadmap

## Dívidas técnicas / follow-ups

- **Tooling de dev com CVEs (vite/vitest)**: `npm audit` reporta high/critical
  apenas em dependências de desenvolvimento (vite, vitest, esbuild). Não afetam
  o build de produção nem o runtime (exigem o dev server / vitest UI expostos).
  A correção pede major bump (vite 8 / vitest 5) — planejar upgrade coordenado
  com revalidação dos testes. Produção (`npm audit --omit=dev`) já está sem
  high/critical.
- **react-router (moderate)**: open redirect / hidratação SSR. Não usamos SSR e
  as navegações são internas; avaliar bump para react-router 7 no futuro.

## v2 (ideias — não implementado)

- Biblioteca comunitária de roteiros por trimestre/lição.
- Integração com API bíblica de tradução de domínio público para autocompletar
  textos do `VERSE_HIGHLIGHT`.
- Modo "grupo pequeno / célula" sem projetor (o celular do líder faz esse papel).
- Badges coletivos por presença e participação ao longo do trimestre.
- Exportar resumo da aula para WhatsApp (texto formatado).

## Leitura Diária / WhatsApp (evoluções futuras)

Ideias registradas a partir da PARTE 10 (ainda não implementadas):

- **Personalização de template da arte** por professor/turma (cores, logo).
- **Múltiplos layouts de leitura** (além do modelo El Shaday padrão).
- **Calendário de leituras** (visão mensal, planejamento antecipado).
- **Sequência automática de leituras** (plano de leitura em série).
- **Estatísticas de entrega** (enviadas/entregues/lidas por período).
- **Confirmação de leitura** ("li"/reação) pelos membros.
- **Compartilhamento individual** (link/arte por pessoa).
- **Integração futura com outros canais** de comunicação (e-mail, Telegram etc.).
