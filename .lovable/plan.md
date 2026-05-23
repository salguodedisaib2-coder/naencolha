## Aumentar o tamanho do logo

Tornar o logo maior em todas as páginas (home, perfil da criadora e login).

### Alterações

| Arquivo | Tamanho atual | Novo tamanho |
|---|---|---|
| `src/routes/index.tsx` (header da home) | `h-14 md:h-20` | `h-20 md:h-28` |
| `src/routes/$username.tsx` (header do perfil) | `h-14 md:h-20` | `h-20 md:h-28` |
| `src/routes/login.tsx` (tela de login) | `h-20 md:h-24` | `h-28 md:h-36` |

Nenhuma outra lógica é alterada — só as classes Tailwind de altura no componente `<Logo />`.