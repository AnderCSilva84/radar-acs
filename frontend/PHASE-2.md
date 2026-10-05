# Radar ACS — Fase 2 (local, sem deploy)

## Histórico

`GET /api/briefing/history?limit=5&cursor=YYYY-MM-DD` é uma extensão somente de leitura de `radarApi`. Usa `briefings`, filtro `publicado == true`, ordenação `data desc` e o índice existente. `limit` é inteiro entre 1 e 5; cursor é data real. O contrato de publicação existente mantém um documento por data (`id = data`), portanto `startAfter(data)` pagina sem consultar o documento do cursor. Nenhuma coleção, índice ou regra foi criado.

Cada página retorna `success`, `editions` e `nextCursor`. As edições incluem somente `data`, `titulo`, `roteiroAlexa`, `audioUrl`, `publicado` e `noticias` projetadas pela allowlist existente. Nenhuma evidência, diagnóstico, token ou custo é retornado. O GET latest e a proteção de publicação foram preservados.

Uma query por página; até 5 documentos lidos. Não lê notícia individual, não conta documentos nem busca um sexto documento para confirmar continuidade. Uma página cheia fornece cursor; se for a última, Carregar mais pode retornar vazio (cobrança mínima de uma leitura para query vazia). Abrir/fechar uma edição já carregada custa zero leituras. Revisitar/recarregar Histórico inicia uma nova página, sem cache persistente ou polling.

DEV: `/api/radar/history` → proxy Vite → `/radarApi/api/briefing/history`, mantendo query string. PROD: `/api/briefing/history` → rewrite Hosting `/api/**` existente. O endpoint novo ainda não está implantado: antes de deploy autorizado da API, o histórico em localhost conectado à produção retorna erro seguro. Testes usam mocks.

## Preferências

O site público não oferece sessão administrativa autenticada. O token de publicação não é disponibilizado ao frontend. Nesta fase, não existe endpoint de escrita de preferências nem documento `settings/radar` criado.

Persistência exclusivamente em `localStorage`, chave `radar-acs.preferences.v1`, com `editorial` e `appearance`. Apenas categorias e enums conhecidos são aceitos; JSON inválido/armazenamento indisponível na leitura restaura defaults. Escrita bloqueada exibe erro e mantém o preview. Restaurar padrões modifica o preview; Salvar confirma no dispositivo. Não sincroniza com servidor nem altera o gerador.

As oito categorias usam high/medium/low/off; defaults seguem a entrada editorial. Densidade comfortable/compact modifica somente o preview. A Home conserva sua identidade e o radar original.

## Capas para reutilização futura

| coverId | Conceito visual |
| --- | --- |
| radar | Círculos, varredura e pontos; dark + ciano. Default. |
| acs | Institucional: azul profundo/elétrico, linhas digitais e logo ACS em destaque. |
| radar-news | Arte local fornecida pelo usuário, com radar/globo/notícias e marca incorporada. |

Radar/ACS usam SVG leve e a logo local; Radar News usa o asset local original. Miniaturas e preview 16:9. Data/título usam a edição já carregada ao navegar desde Hoje. Em deep link direto de Preferências, não busca a API só para preencher o preview; mostra texto neutro sem inventar edição/data. Consulte [COVERS.md](COVERS.md) para descoberta dos arquivos, migração e extensão futura.

Sem APL, Echo Show real, áudio ou alteração de Alexa.

## Rotas e verificação

`/`, `/history`, `/preferences`: History API nativa + anchors reais, sem biblioteca de rotas adicional. Back/Forward usa popstate. O fallback SPA existente cobre deep links. Histórico tem loading/error/empty; preferências funcionam sem API. Navegação mobile permanece visível.

Execute `npm test` na raiz; em frontend, `npm test`, `npm run test:browser`, `npm run build`. Os testes de navegador interceptam todas as chamadas de API. Nenhuma operação real de Firestore, OpenAI ou pesquisa web é necessária para validar esta fase.
