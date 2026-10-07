# Auditoria local — Product + Commercial Release

Concluída em 05/10/2026. Sem deploy, geração, upload real ou escrita remota.

## Performance

| Bundle principal | Antes | Depois |
| --- | ---: | ---: |
| Bruto | 504.381 bytes | 269.700 bytes |
| Gzip | 139.772 bytes | 85.364 bytes |
| Brotli | 118.806 bytes | 73.792 bytes |

Redução de 46,5% no JavaScript principal. React DOM é seu maior contribuinte. Firebase Auth, anteriormente no bundle inicial, agora pertence ao chunk privado AdminArea (174,07 kB bruto); Central Comercial (20,50 kB), preferências/catálogo (10,44 kB), calendário, rádios e login são carregados sob demanda. Firebase Storage também permanece em chunk separado. O CSS continua compartilhado: não houve micro-otimização visual.

`App.jsx` separa as rotas com lazy/Suspense; `AdminArea.jsx` mantém autorização e carrega páginas privadas sob demanda. Os testes de Legal foram adaptados à renderização assíncrona. O plugin local de auditoria do Vite grava o grafo em review, fora de dist. Pesos de módulos nesse grafo são anteriores à minificação, não bytes transferidos.

Validação do build local com APIs e autenticação simuladas: Home, Listen, Live e History HTTP 200; nenhum módulo administrativo carregado. Central Comercial autorizada carrega seu chunk privado. Artefato: `frontend/review/product-round/public-bundle-audit.json`. Dist não contém testes, review, scripts de auditoria ou source maps.

## Imagens e clubes

Imagem de notícia opcional; notícias antigas usam fallback. URL insegura, falha, imagem pequena ou timeout retomam fallback com proporção reservada. Não há cópia para Storage nem chamada adicional de IA. URL sozinha não equivale a autorização editorial de uso.

Catálogo 2026: 20 clubes Série A, 20 Série B e 20 Série C, conferidos nas fontes oficiais indicadas em `product-commercial-round.md`. IDs de provider e escudos permanecem nulos quando não verificados. Botafogo seguido preserva sua identidade anterior. Busca normaliza caixa e acentos; Botafogo, Paysandu, Remo, Flamengo e termos parciais retornam resultados. Não há inferência de divisão nem IDs técnicos na interface.

## Comercial e carrossel

Fluxos testados somente com mocks: anunciante, campanha, datas, posição, CTA, seleção local, preview contain/cover em Desktop/Tablet/Mobile, rascunho e confirmação de publicação. Seleção e preview não enviam arquivo. Upload ocorre somente no salvamento explícito autorizado.

HOME_TOP: zero campanhas não renderiza; uma é estática; duas ou mais usam carrossel. Testados anterior/próximo, indicadores, swipe e teclado. Autoplay opcional, desligado por padrão, intervalo de oito segundos, pausa por interação, página oculta e reduced-motion. Dimensões reservadas estabilizam layout. Nenhum coletor de métricas, cookie ou plataforma externa foi conectado.

## Storage

- Bucket: `radar-acs.firebasestorage.app`.
- Caminho: `advertising/{campaignId}/{uuid}.{jpg|png|webp}`.
- Limite: maior que zero e até 5 MiB (5.242.880 bytes).
- MIME: image/jpeg, image/png, image/webp; extensão correspondente obrigatória.
- Criação e exclusão: somente Firebase Auth com o UID superadmin já configurado. Atualização de arquivo existente proibida.
- Leitura individual pública de caminho válido; listagem proibida; demais caminhos negados.
- Frontend utiliza URL pública do Firebase Storage com `alt=media`, sem download token. Público não possui autorização de upload pelas regras auditadas.

Cliente valida assinatura binária e dimensões; as Rules validam identidade, caminho, tamanho e contentType, não decodificam a imagem. Esta auditoria não executou upload nem reimplantou regras.

## Backend e futuro deploy

Alterações locais da release anterior, preservadas nesta auditoria:

| Arquivo | Efeito |
| --- | --- |
| api/advertising.js | Anunciantes, rascunhos, prioridades e projeção pública sem campos privados |
| api/editorial-settings.js | Referência opcional catalogId, preservando vínculos existentes |
| api/news-image.js | Validação/proveniência de metadados opcionais de imagem |
| api/public-news.js | Whitelist pública de imagens |
| api/validation.js | Validação dos campos opcionais de imagem |
| api/source-evidence-store.js | Reaproveitamento de imagem já recebida da fonte |
| api/generator.js | Associação da imagem observada ao candidato validado |

Endpoints afetados: GET latest/history, GET advertising, GET/PUT admin/advertisers e GET/PUT admin/editorial. Nenhum endpoint novo para esta release.

Para comercial, catálogo e leitura pública: futuro deploy de radarApi + Hosting. Para ativar também o enriquecimento opcional de imagens durante geração: generateRadarManual e generateRadarScheduled precisam receber o código compartilhado alterado. Portanto a release completa envolve essas três Functions. Handlers/configuração IAM, secrets, Scheduler/cron/OIDC, prompt e número de chamadas não foram alterados nesta auditoria. Os diffs anteriores de handler.js/index.js pertencem a outras tarefas e não foram tratados como alterações novas desta auditoria.

Firestore Rules e índices: nenhuma mudança. Storage Rules: nenhuma mudança nesta rodada; reutilizam as regras existentes. Nenhum deploy realizado.

## Verificação e capturas

Backend: 277 aprovados; frontend: 188 aprovados; navegador: 52 aprovados; zero falhas. Build de produção PASS. Verificação adicional do build e das buscas PASS.

Capturas renovadas em `frontend/review/product-round`: admin-teams-desktop.png, admin-teams-mobile.png, commercial-dashboard.png, campaign-create.png, campaign-preview-desktop.png, campaign-preview-mobile.png e home-carousel-preview.png. A segunda campanha do preview é identificada como técnica local, nunca cadastrada em produção. Capturas de página completa usam ajustes exclusivos do screenshot, sem mudar o CSS da aplicação.

Pronto para deploy controlado: SIM. Esta auditoria não valida a release em produção: publicação e verificação remota continuam pendentes de autorização.
