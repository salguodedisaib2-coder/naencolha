## Objetivo
Adicionar opções de vídeo gratuito, resolução e duração automática ao formulário de upload em `/admin`.

## Mudanças no banco (migration)
Acrescentar à tabela `videos`:
- `is_free` boolean NOT NULL DEFAULT false
- `resolution` text NULL (ex: "720p", "1080p", "1440p", "4K")
- `duration_seconds` integer NULL

Ajustar a checagem de preço para permitir 0 quando `is_free = true` (a constraint atual `price_brl >= 0` já cobre, então basta forçar `price_brl = 0` no submit quando gratuito).

Atualizar políticas/lógica de compra: vídeos com `is_free = true` devem permitir play direto sem registro em `purchases`. A UI do player/listagem precisa checar `is_free` antes de exigir compra.

## Mudanças no formulário (`src/routes/_authenticated/admin.tsx` — `VideosTab`)

No card "Novo conteúdo":
1. **Checkbox "Vídeo gratuito (para divulgação)"** — quando marcado, oculta/desabilita o campo Preço e envia `price_brl = 0`, `is_free = true`.
2. **Dropdown "Resolução (opcional)"** com opções: 480p, 720p, 1080p (Full HD), 1440p (2K), 2160p (4K), 4320p (8K), além de "Não informar".
3. **Duração automática**: ao escolher o arquivo de vídeo, ler `video.duration` (já é lido para a thumbnail no `captureFromVideo`) e salvar em `duration_seconds`. Mostrar duração formatada (mm:ss) abaixo do campo de arquivo, somente leitura.

Mesmos campos no formulário de edição (`editForm`): checkbox gratuito, dropdown de resolução. Duração só é definida no upload inicial (não re-editável a menos que troque o arquivo).

## Mudanças na exibição
- Lista de conteúdos do admin: mostrar badge "Grátis" quando `is_free`, e a resolução/duração quando presentes.
- Página pública (`$username` e player): se `is_free`, liberar play sem fluxo de compra; mostrar badge "Grátis".

## Detalhes técnicos
- `is_free` no `useState` do form inicializa `false`; ao alternar, força `price` para `"0"`.
- Resolução: `<select>` simples ou `Select` do shadcn já usado no projeto.
- Duração: armazenada em segundos (int) para facilitar formatação; helper `formatDuration(sec)` → `mm:ss` ou `hh:mm:ss`.
- Migration usa `ALTER TABLE` com `IF NOT EXISTS` nas colunas novas.

## Não incluso
- Não altera fluxo de pagamentos para vídeos pagos (continua igual).
- Não detecta automaticamente a resolução do arquivo (usuária escolhe manualmente).
