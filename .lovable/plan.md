# Plano — NaEncolha (Fundação)

Construir a base completa do SaaS multitenant em PT-BR, sem o fluxo de pagamento PIX (fica para próximo ciclo).

## 1. Backend (Lovable Cloud / Supabase)

Ativar Lovable Cloud e criar via migration:

**Enum de papéis e tabelas**
- `app_role` enum: `super_admin`, `creator`, `customer`
- `user_roles` (id, user_id → auth.users, role) — separada do profile (anti-escalation)
- `profiles` (id → auth.users, username único, full_name, bio, cover_photo_url, avatar_url, whatsapp, is_active, created_at)
- `service_categories` enum: `gerais`, `especiais`, `aparencia_etnia`, `aparencia_cabelo`, `aparencia_estatura`, `aparencia_corpo`, `aparencia_seios`, `aparencia_pubis`, `atendimento`, `contato`, `lugar`
- `services` (id, label, category, sort_order) — catálogo global pré-populado com as ~60 tags do brief
- `creator_services` (creator_id, service_id) — junção
- `free_photos` (id, creator_id, photo_url, order_index)
- `videos` (id, creator_id, title, description, thumbnail_url, video_url, price_brl numeric, is_active, created_at, purchase_count)
- `customers` (id, email único, phone, name, created_at)
- `purchases` (id, customer_id, video_id, creator_id, amount_paid, pix_transaction_id, status, download_token, download_expires_at, created_at) — estrutura pronta para o ciclo de PIX

**Storage buckets**
- `avatars` (público), `covers` (público), `free-photos` (público), `videos` (privado, signed URLs), `thumbnails` (público)

**RLS**
- Função `has_role(uuid, app_role)` security definer
- `profiles`, `videos`, `free_photos`, `creator_services`: SELECT público quando `is_active`
- Criadora só faz UPDATE/INSERT/DELETE nas próprias linhas (`auth.uid() = creator_id`)
- `purchases` / `customers`: só super_admin via RLS (cliente recebe download por token, não via API)
- Trigger `handle_new_user` cria profile + role `creator` em sign-up

## 2. Design System (`src/styles.css`)

Dark + crimson:
- `--background` quase-preto, `--foreground` off-white
- `--primary` crimson (~oklch equivalente a #C0392B), `--primary-foreground` branco
- `--card` cinza escuro, `--border` sutil, `--muted` para chips inativos
- Fonte: Inter via Google Fonts
- Variantes de botão: `hero` (gradiente crimson), `outline-crimson`
- Componente `Chip` para as tags de serviços (estados ativo/inativo)
- Skeletons e toasts (sonner) já incluídos

## 3. Rotas (TanStack file-based)

- `src/routes/__root.tsx` — head meta PT-BR, Toaster, QueryClient, age gate global
- `src/routes/index.tsx` — landing: hero + busca + filtros por categoria + grid de criadoras ativas
- `src/routes/$username.tsx` — perfil público (capa, avatar, bio, botão WhatsApp, tags por categoria, galeria de fotos com lightbox, grid de vídeos com botão "Comprar via PIX" desabilitado/placeholder)
- `src/routes/login.tsx` — auth (email + senha) com redirect
- `src/routes/_authenticated.tsx` — guard via `beforeLoad`
- `src/routes/_authenticated/admin.tsx` — layout do painel da criadora com tabs:
  - Meu Perfil (upload avatar/capa, bio, WhatsApp, toggle ativo)
  - Meus Serviços (grid de chips toggleáveis agrupados por categoria)
  - Fotos Gratuitas (upload múltiplo, reorder por drag, delete)
  - Meus Vídeos (upload vídeo + thumb, título/desc/preço, toggle, contador de vendas, delete)
  - Financeiro (lista de compras pagas + filtro por data + total) — vazio até PIX existir
- `src/routes/_authenticated/superadmin.tsx` — gated por `has_role('super_admin')`: lista criadoras, toggle ativo, criar nova criadora (invite), stats da plataforma

## 4. Componentes-chave

- `AgeGate` (modal, persiste em localStorage)
- `CreatorCard`, `ServiceChip`, `VideoCard` (com badge de preço), `PhotoLightbox`
- `WhatsAppButton` (gera `https://wa.me/55<numero>`)
- Header público com logo + busca; header do admin com tabs e sign-out

## 5. Server functions

- `getActiveCreators({ search?, categoryIds? })` — lista pública para o index
- `getCreatorByUsername(username)` — perfil + serviços + fotos + vídeos
- `getMyProfile()`, `updateMyProfile()`, `setMyServices(ids[])`, `addFreePhoto`, `reorderFreePhotos`, `deleteFreePhoto`, `createVideo`, `updateVideo`, `deleteVideo`
- `listAllCreators()`, `setCreatorActive()` (super_admin only)

Todas com `requireSupabaseAuth` exceto as duas públicas. Upload de mídia direto do cliente para Storage (signed upload) — server fn só registra o registro.

## 6. SEO

- `head()` por rota com title/description PT-BR
- `/$username` deriva og:image do `cover_photo_url` quando existir
- `sitemap.xml` lista `/` + cada `/username` ativo; `robots.txt` permissivo

## 7. Aviso importante (conteúdo adulto)

- O fluxo de PIX e o gateway ficam para o próximo ciclo (você escolheu "decidir depois").
- Gateways tradicionais (Mercado Pago, Stripe) **proíbem conteúdo adulto** nos termos de uso. Antes do próximo ciclo recomendo avaliar gateways especializados (Segpay, CCBill, ou PIX via PSP que aceite — ex: alguns sub-adquirentes específicos). Posso pesquisar opções quando chegarmos lá.
- Hospedagem de vídeos adultos em Supabase Storage também está sujeita aos termos de uso deles — vale validar.

## Não incluído neste ciclo

- Geração de QR Code PIX, webhook de pagamento, página `/download/{token}`, envio de e-mail transacional, integração com gateway
- Painel de comissões do super admin (estrutura fica pronta, UI fica para depois do PIX)

Após aprovação, começo ativando o Cloud e aplicando a migration.
