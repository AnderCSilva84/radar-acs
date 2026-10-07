# Spotify Embed — auditoria mobile

ACS Music usa type playlist, ID `21Zn60qgps8agFlajllsd6`. O parser já removia parâmetros de compartilhamento e rejeitava outras entidades. `spotifyEmbedUrls` centraliza canonical e embed sem alterar dados cadastrados.

Iframe segue o exemplo oficial: width 100%, height 352, frameBorder 0, allowFullScreen, lazy e allow autoplay/clipboard-write/encrypted-media/fullscreen/picture-in-picture. Não há sandbox, iframe intermediário, bloqueio de cookies/scripts ou leitura do documento interno. CSS altera apenas o contêiner externo.

Referência: https://developer.spotify.com/documentation/embeds/tutorials/creating-an-embed

HTTP 200 do iframe ou evento load não comprovam disponibilidade da playlist. A mensagem interna Page not found não pode ser detectada pelo código da página por causa de cross-origin. O fallback é acionado por erro nativo quando emitido ou pelo botão explícito Player não carregou?; não há timeout, inspeção DOM cross-origin, mensagem inventada nem desativação por user-agent/largura.

O player oficial permanece disponível no desktop e mobile. Após fallback, o iframe é removido e a orientação/link ficam no card real já existente, sem duplicar título/descrição. Não há API Spotify, OAuth, SDK ou credenciais novas.

Auditoria de leitura em `frontend/review/spotify-ios/audit.json`: Chromium desktop e emulação iPhone de 390 px. Emulação Chromium não comprova Safari/iOS ou PWA físicos. WebKit só é utilizado se já instalado; nenhuma instalação automática. Não concluir que a playlist inexiste a partir de um ambiente automatizado. Não modificar cadastro para testar.
