# Identidade visual da edição

`edition.coverId → registro local → EditionHero / Histórico / Alexa APL`.

O PWA respeita qualquer coverId conhecido da edição, depois a preferência local,
depois Radar. Não escreve preferências quando uma capa contextual aparece.
Histórico resolve a capa pelo próprio documento recebido, sem consultas adicionais,
migração ou alteração dos documentos antigos. A paginação permanece de até cinco edições.

Alexa não tem acesso ao localStorage do navegador: usa coverId ou Radar.
`lambda/cover-registry.json` documenta os quatro IDs e assets públicos equivalentes.
Radar e ACS são rasterizações locais das mesmas composições SVG do PWA.
Radar News e Eleições usam os PNGs originais. APL usa PNG para compatibilidade;
PWA usa picture com WebP, PNG e composição local em caso de erro.
PNGs originais não são sobrescritos. Os nomes públicos continuam com no-cache;
somente os assets com hash do Vite usam immutable.

APL 1.0 é autocontido, com Image best-fit, dimensões proporcionais e metadata
abaixo da arte. Não altera SSML, TTS, intents, tarefas ou playback. Só envia
RenderDocument quando Alexa.Presentation.APL está presente. Falha de resolver
não afeta a fala; falha de download da imagem ocorre no renderer e não tem
dependência no pipeline de áudio. Não faz HEAD nem requisição adicional na Lambda.

## Development: atualização visual segura

APL foi habilitado e salvo no console por Anderson. O manifest local registra
somente a interface ALEXA_PRESENTATION_APL; não é uma exportação fiel dos perfis
remotos. **Não importar/substituir o manifest remoto por este arquivo.**
A configuração local de endpoints/modelo não foi alterada.

APL e os perfis foram confirmados na sessão autenticada do Developer Console.
O código visual foi salvo e implantado no ambiente Development por essa sessão,
sem importar manifest. Não houve promoção para Live nem certificação.

O index remoto ainda não contém a Custom Task preparada localmente. Por isso,
**não copiar cegamente o index local sobre ele**: foram adicionados somente o
import de edition-visual e addEditionVisual(input, briefing) ao Launch handler
existente. Todo o restante do texto remoto foi comparado e preservado. Apenas
edition-visual.js, edition-cover-apl.json e cover-registry.json foram adicionados.
briefing-client.js, playback.js, config.json e package.json não foram enviados.

O build em **Radar ACS → Build → Interaction Model → JSON Editor → Build skill**
foi concluído: o console confirmou “Build Completed / Build was successful”.
Não usar Update live skill, Promote to live ou Certification.

Em **Test**, selecionar Development e Portuguese (BR), testar “abra radar acs”
no simulador com tela e verificar RenderDocument, capa e fala. Depois, no Echo
Show da mesma conta com a Skill Development habilitada, dizer “Alexa, abra Radar
ACS”. A capa permanece durante a apresentação; a edição narrada e o visual usam
o mesmo objeto retornado pela API. Em um Echo sem tela, verificar a mesma fala.
Não disparar dispositivo físico via automação. A capa futura é testada por mocks;
não criar a edição #003 para testar.

## Verificação desta entrega

156 testes na suíte completa (incluindo Alexa), 14 testes Alexa específicos,
39 testes unitários frontend e 20 testes de navegador; todas as suítes sem falhas.
Build Vite aprovado. Hosting implantado isoladamente no projeto radar-acs,
número 596095541153; nenhuma Function implantada. Home, History e Preferences
HTTP 200. Latest #002 com cinco notícias; histórico #001 e #002. Quatro capas PNG
públicas HTTP 200 / image/png. Documento 2026-10-04 ausente (404). Scheduler apenas
consultado: ENABLED, 0 8 * * *, America/Belem. Nenhuma geração ou escrita Firestore.
Leituras estimadas para verificação: três pelos GETs e uma pontual para ausência
de #003; nenhuma leitura adicional para resolver capas.

Derivados locais (qualidade WebP 0,94, mesmas dimensões):
- Radar News: PNG 1.871.911 bytes → WebP 299.680 bytes, redução 83,99%.
- Eleições: PNG 2.190.801 bytes → WebP 404.976 bytes, redução 81,51%.
Os PNGs originais foram apenas lidos. O teste físico Echo Show permanece manual.
