## 1. Aba "Vouchers" no painel da criadora (auditoria de vendas)

Hoje os vouchers só aparecem dentro do diálogo de cada vídeo. Criar uma visão geral em `src/routes/_authenticated/admin.tsx` como nova aba ao lado de Conteúdos/Financeiro.

### Nova aba "Vouchers"
- Tabela única com **todos os vouchers da criadora** (mais recentes primeiro), colunas:
  - Código
  - Vídeo (título, com miniatura pequena)
  - Comprador (`customer_label` — nome/telefone que ela anotou)
  - Valor recebido
  - Criado em
  - Último uso + nº de usos
  - Status (ativo/revogado) com botão "Revogar"

### Filtros no topo
- Período: **Hoje / 7 dias / Este mês / Tudo** (default: Este mês)
- Busca por texto (código ou comprador)
- Filtro por vídeo (dropdown com seus vídeos)
- Filtro por status (ativos / revogados / todos)

### Cards de resumo (acima da tabela)
Calculados em cima dos filtros ativos:
- **Vouchers emitidos** (contagem)
- **Receita total** (soma de `amount_paid`)
- **Vídeo mais vendido no período** (top 1, com link pro vídeo)

### Ranking "Mais vendidos"
Pequeno bloco abaixo dos cards: top 5 vídeos por nº de vouchers no período, com botão **"Destacar na home"** em cada um (marca `is_featured=true` no vídeo — flag nova, ver abaixo).

### Destaque na home
- Adicionar coluna `is_featured boolean default false` em `videos` (migração).
- Em `src/routes/index.tsx`, se existirem vídeos com `is_featured=true`, mostrar uma faixa **"Mais vendidos"** no topo (carrossel horizontal de `VideoCard`).
- Sem destaque manual, a home continua igual.

### Dados (server functions novas em `src/lib/vouchers.functions.ts`)
- `listAllVouchers({ from?, to?, videoId?, status?, search? })` — protegida, retorna vouchers da criadora com join do título/thumbnail do vídeo.
- `getVoucherStats({ from?, to? })` — protegida, retorna `{ count, revenue, topVideos: [{videoId, title, count, revenue}] }`.
- `setVideoFeatured({ videoId, featured })` — protegida, valida posse e atualiza `is_featured`.

Tudo já filtrado por `creator_id = auth.uid()` via RLS existente.

## 2. Logo maior no header

Aumentar nas 3 telas que usam `Logo`:
- `src/routes/index.tsx`: `h-10 md:h-12` → `h-14 md:h-20`
- `src/routes/$username.tsx`: `h-10 md:h-12` → `h-14 md:h-20`
- `src/routes/login.tsx`: `h-14` → `h-20 md:h-24`

## Arquivos afetados

- Migração nova: `videos.is_featured`
- `src/lib/vouchers.functions.ts` (3 funções novas)
- `src/routes/_authenticated/admin.tsx` (nova aba `VouchersTab`)
- `src/routes/index.tsx` (faixa "Mais vendidos" + logo)
- `src/routes/$username.tsx` (logo)
- `src/routes/login.tsx` (logo)
