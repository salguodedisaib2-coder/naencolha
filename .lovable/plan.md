## Sistema de Voucher por Vídeo

Fluxo end-to-end simples: a acompanhante gera um código no admin, envia pelo WhatsApp; o cliente digita o código no site e libera assistir + baixar aquele vídeo específico.

### 1. Banco de dados

Nova tabela `video_vouchers`:
- `id` (uuid)
- `video_id` (uuid) — vídeo liberado
- `creator_id` (uuid) — dona do vídeo (para RLS)
- `code` (text, único) — código curto tipo `MIRE-7K2X` (8 chars, sem caracteres confusos como O/0/I/1)
- `customer_label` (text, opcional) — nome ou telefone que a acompanhante anota pra se lembrar de quem é
- `amount_paid` (numeric, opcional) — valor recebido
- `is_active` (bool, default true) — pode ser revogado
- `created_at`, `last_used_at`, `use_count`

RLS:
- Acompanhante (creator) gerencia apenas seus próprios vouchers
- Validação/uso de voucher acontece via server function com `supabaseAdmin` (cliente não autenticado)

### 2. Admin — geração de voucher

Em `src/routes/_authenticated/admin.tsx`, em cada card de vídeo já listado:
- Botão **"Gerar voucher"**
- Abre um pequeno modal com:
  - Campo opcional "Quem comprou" (nome/telefone — só pra organização dela)
  - Campo opcional "Valor recebido"
  - Botão "Gerar código"
- Ao gerar: mostra o código grande (ex.: `MIRE-7K2X`), com botão **"Copiar"** e **"Enviar no WhatsApp"** que abre o WhatsApp dela com mensagem pronta tipo:
  > Aqui está seu voucher: **MIRE-7K2X**
  > Acesse https://naencolha.com/voucher e digite o código pra assistir e baixar.
- Lista de vouchers já emitidos por vídeo (código, comprador, status, último uso) com botão **"Revogar"**

### 3. Cliente — usar voucher

Duas portas de entrada (a mesma tela):
1. Nova rota pública `/voucher` — página dedicada com campo "Digite seu voucher"
2. Botão **"Já tenho voucher"** no `VideoCard` (ao lado de "Comprar via PIX") — abre o mesmo modal

Comportamento:
- Cliente digita o código → server function valida
- Se válido e ativo: redireciona pra `/voucher/{code}` (player) — mostra vídeo no player com controles nativos, botão **"Baixar vídeo"** (link de download direto), título do vídeo e nome da acompanhante
- Voucher é **reutilizável** — o cliente pode voltar e rever quando quiser (registra `last_used_at` e incrementa `use_count`)
- Se inválido/revogado: mensagem clara "Voucher inválido. Confirme com a acompanhante."

### 4. Server functions (TanStack)

`src/lib/vouchers.functions.ts`:
- `createVoucher({ videoId, customerLabel?, amountPaid? })` — protegida com `requireSupabaseAuth`, valida que o vídeo pertence ao usuário, gera código único (com retry se colidir)
- `revokeVoucher({ voucherId })` — protegida, marca `is_active=false`
- `redeemVoucher({ code })` — pública, sem auth, usa `supabaseAdmin`: valida código, retorna URL assinada do vídeo (10 min) + metadados (título, capa, nome da criadora) + URL de download (assinada, 1 hora, com `?download=true`)

### 5. Por que esse design é simples e prático

**Pra acompanhante:**
- 2 cliques no admin → código pronto → 1 clique pra mandar no WhatsApp
- Não precisa cadastrar cliente nem gerenciar conta
- Pode revogar se houver problema

**Pro cliente:**
- Não precisa criar conta, login, senha
- Digita o código uma vez e acessa quando quiser
- Funciona em qualquer dispositivo

### Detalhes técnicos

- Código gerado por server function (3 chars do username + `-` + 4 chars aleatórios maiúsculos do alfabeto `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`)
- URL assinada do bucket privado `videos` (já existe) — `createSignedUrl(path, 600)` pra streaming, `createSignedUrl(path, 3600, { download: true })` pro botão de baixar
- Sem expiração de voucher por padrão (acompanhante revoga manualmente se precisar)
- Sem cobrança automática — o controle de pagamento continua manual via WhatsApp (a acompanhante só gera o voucher depois de confirmar o PIX recebido)

### Arquivos afetados

- Migração nova (`video_vouchers` + RLS)
- `src/lib/vouchers.functions.ts` (novo)
- `src/routes/_authenticated/admin.tsx` (botão "Gerar voucher" + modal + lista)
- `src/components/VideoCard.tsx` (botão "Já tenho voucher")
- `src/routes/voucher.tsx` (página de redenção — entrada do código)
- `src/routes/voucher.$code.tsx` (player + download)