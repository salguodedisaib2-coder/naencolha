## Adicionar "Pack de Vídeos" no admin

Hoje no painel da criadora existem 2 tipos: **Vídeo** (unitário) e **Pack de Fotos**. Vou adicionar um terceiro tipo: **Pack de Vídeos** (vários vídeos vendidos como um único produto).

### O que muda

**1. Banco de dados (migração)**
- Nova tabela `pack_videos` (espelho do `pack_photos`):
  - `id`, `creator_id`, `video_id` (referência ao registro em `videos`), `video_url`, `order_index`, `created_at`
- RLS: criadora gerencia os próprios; super admin gerencia todos; leitura pública (igual `pack_photos`)
- Coluna `videos.content_type` passa a aceitar também o valor `video_pack` (além de `video` e `photo_pack`)

**2. Painel da criadora (`/admin`)**
- Botão de tipo passa a ter 3 opções: **Vídeo unitário** · **Pack de vídeos** · **Pack de fotos**
- Quando "Pack de vídeos" é selecionado:
  - Upload de **múltiplos arquivos** de vídeo (igual ao pack de fotos hoje)
  - Conversão automática H.265 → H.264 aplicada em cada vídeo enviado (reaproveita o pipeline existente)
  - Thumbnail: gerada automaticamente do **primeiro vídeo** (ou enviada manualmente como capa do pack)
  - Mesmo fluxo de título, descrição, preço, gratuito/pago
- Salvar: cria 1 registro em `videos` com `content_type='video_pack'` + N registros em `pack_videos`
- Excluir conteúdo: também limpa `pack_videos`

**3. Listagem do conteúdo (cards do admin e super admin)**
- Badge mostra "Pack de vídeos" quando aplicável (hoje mostra "Vídeo" ou "Pack de fotos")
- Super admin: botões de download passam a listar todos os vídeos do pack

**4. Página pública da criadora (`/$username`)**
- Card do pack de vídeos mostra a capa + selo "Pack" + quantidade de vídeos
- Após compra/voucher, página de download lista os vídeos do pack (igual fotos do pack hoje)

### Detalhes técnicos

- `pack_videos` segue exatamente o mesmo padrão de `pack_photos` para manter consistência
- Conversão H.264 reaproveita `ensureH264` em loop sobre os arquivos selecionados
- Não mexer no fluxo atual de "Vídeo unitário" nem de "Pack de fotos" — só adicionar o novo caminho

### Fora do escopo

- Não vou mexer no preço por unidade (preço é único do pack)
- Não vou adicionar prévia/trailer de pack de vídeos nesta etapa
