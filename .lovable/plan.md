## Loja de vídeos completa + carrossel na home

### 1. Home (`src/routes/index.tsx`) — seção "Mais vendidos"
- Mostrar apenas **3 cards por vez** (responsivo: 1 no mobile, 2 em tablet, 3 em desktop).
- Adicionar **setas laterais** (◀ ▶) para navegar entre os vídeos em destaque (scroll horizontal por página).
- Adicionar um botão/link **"Ver todos os conteúdos →"** ao lado do título, levando para `/conteudos`.
- Cards continuam linkando para o perfil da criadora (comportamento de compra atual preservado).

### 2. Nova rota `src/routes/conteudos.tsx` — loja completa
- Header reutilizando o `<Logo />` igual à home.
- Título: "Todos os conteúdos".
- Campo de busca por título do vídeo + nome da criadora.
- Filtro por faixa de preço (Grátis / Pago) — toggle simples.
- Ordenação: Mais recentes / Mais vendidos / Preço.
- Grid responsivo (2 col mobile, 3 tablet, 4 desktop) listando **todos** os vídeos ativos de criadoras ativas.
- Cada card mostra capa, título, criadora, preço e linka para `/{username}` (mesma jornada de compra).
- SEO: `head()` com title "Conteúdos | NaEncolha" e meta description.

### 3. Navegação
- Adicionar link **"Conteúdos"** no header da home (`index.tsx`) e do perfil (`$username.tsx`) ao lado de "Área da criadora".

### Detalhes técnicos
- Carrossel: usar estado `pageIndex` + transform CSS, sem dependência nova. Setas escondidas quando não há próxima/anterior.
- Query nova em `conteudos.tsx`: `videos` com join em `profiles!inner` filtrando `is_active=true` dos dois lados, sem `is_featured`.
- Mesma rota e tabela já existentes — sem migração de banco.