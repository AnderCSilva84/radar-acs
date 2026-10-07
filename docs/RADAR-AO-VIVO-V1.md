# Radar Ao Vivo V1

## Reuso e escopo

Os endpoints ficam em radarApi. Firestore continua privado; leitores usam a API sem login. Administração utiliza a verificação de ID token revogado e o ADMIN_UID existentes. Preferências vêm de settings/editorial; a mídia fica em um único documento settings/listen. Publicidade continua independente. Nenhuma edição, gerador, Scheduler ou arquivo Alexa é alterado.

Rotas públicas: /live e /listen. Administração: /admin/radios. API: GET /api/live, /api/live/football, /api/live/football/team/:id, /api/live/radios. /api/admin/radios aceita GET/PUT do admin, no mesmo padrão dos anunciantes. Uma gravação substitui o documento consolidado; não existe uma escrita por mídia.

## Futebol e disponibilidade real

LiveProvider é o contrato base. FootballProvider é a especialização de futebol. ElectionProvider poderá implementar o mesmo contrato no futuro; nenhuma apuração foi criada.

FootballDataProvider adapta o endpoint documentado /v4/competitions/BSA/matches por uma função de transporte injetada. Não acessa rede por conta própria nem recebe credenciais no frontend. MockFootballProvider é utilizado somente pelos testes. Produção usa FootballProvider sem fonte configurada: status NOT_CONFIGURED e nenhuma partida fictícia. Essa opção evita contratar dados ao vivo ou criar credenciais nesta tarefa.

Pesquisa técnica: football-data.org oferece Série A brasileira no plano gratuito, com 10 chamadas/minuto e placares/agendas atrasados. Livescores são pagos. TheSportsDB separa recursos premium e o exemplo gratuito público limita busca de times. Não comprovamos uma fonte gratuita sem credenciais adequada a placares brasileiros em tempo real. Portanto não anunciamos cobertura real disponível.

Fontes: https://www.football-data.org/pricing, https://www.football-data.org/coverage, https://www.thesportsdb.com/documentation. Consulta de documentação não é consulta a dados esportivos. Chamadas à API esportiva durante desenvolvimento: zero.

followedTeams mantém id/name/sport/country/active. provider=football-data e providerTeamId são opcionais, sem migração de dados antigos; IDs devem ser verificados, nunca adivinhados. Os módulos usam apenas times ativos, e futebol=off impede consulta ao provider. A Home filtra/ordena cards conforme prioridades; o histórico e o roteiro publicado permanecem intactos. Alterações editoriais continuam alimentando o gerador pelo fluxo existente, sem executá-lo nesta tarefa.

## Cache e custo

Cache on-demand em memória, compartilhado por requests da mesma instância, com single-flight para requisições simultâneas. Configuração e catálogo: 60 segundos; atualização admin invalida cache da instância que gravou, demais instâncias convergem em até 60 segundos. Futebol: ao vivo/intervalo 2 minutos; próximo jogo 30 minutos; encerrado 6 horas; sem partida 12 horas; erro 5 minutos com resultado anterior marcado stale. Não há polling, retry automático ou novo Scheduler. Cache de futebol não escreve no banco.

Limitação explícita: instâncias diferentes têm caches distintos. Com fonte esportiva desativada, há zero chamadas externas esportivas e zero custo de atualização esportiva. Antes de ativar um provider, seu transporte deve impor limites globais compatíveis com o plano gratuito ou adotar cache compartilhado; não ativar com credenciais apenas no ambiente sem essa revisão.

Um cache miss de /api/live lê dois documentos (editorial e listen), no máximo uma vez por janela por instância. /api/live/radios lê apenas listen; futebol lê editorial. Nenhuma escrita ocorre por consulta pública. Existe consumo da infraestrutura Blaze já utilizada: não é possível prometer custo variável total zero de Firestore/Functions. Novas assinaturas, serviços pagos e custo fixo contratado: R$ 0.

## Ouvir

RADIO_STREAM exige enabled=true e usageStatus=approved. Sem autoplay; HTML5 Audio abre a fonte HTTPS diretamente no navegador. O player permanece montado na raiz durante navegação SPA, com pausa, parada, volume e erro seguro. Reload completo não mantém reprodução. Nenhum áudio passa pelo Firebase.

SPOTIFY_PLAYLIST utiliza apenas links HTTPS open.spotify.com/playlist/ID. Nenhum SDK, embed, OAuth, credencial, chamada Spotify, cópia ou retransmissão. O catálogo inicia vazio; nenhum conteúdo fictício é cadastrado. A página funciona sem conta ou aplicativo Spotify. Texto administrativo é renderizado como texto React, nunca HTML.

Somente radarApi e Hosting são necessários no deploy. Não implantar outras Functions, rules, índices, Alexa ou Scheduler.
