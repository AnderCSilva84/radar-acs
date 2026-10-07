# Visual polish + Audiência V1 — implementação local

Nenhum deploy, escrita remota, OpenAI, edição, alteração de Alexa/Scheduler ou mudança no Editorial/Collection V2 nesta tarefa.

## Definições e consentimento

Visitante é identificador aleatório do navegador que aceitou métricas; nunca pessoa única real. ID local dura 30 dias e é removido ao revogar; limpar armazenamento, trocar navegador ou rotação do ID pode gerar novo visitante. Duas abas compartilham o ID, mas têm tab IDs efêmeros distintos. O servidor guarda apenas hash, sem email, IP, UA completo ou geolocalização. DNT/GPC bloqueiam tracking.

Visita é uma navegação pública confirmada pelo React para `/`, `/history`, `/live`, `/listen`. Remontagens consecutivas da mesma rota não duplicam; refresh pode contar outra visita. Navegações canceladas antes do envio não contam. Intervalo mínimo de cinco segundos e máximo de 120 pageviews por ID/dia. Admin/login/API/health/preload/fetch não são pageviews.

Métricas opcionais: aceitação explícita, recusa e revogação disponíveis. Contagens são parciais: refletem apenas navegadores que aceitam e não bloqueiam métricas, nunca toda a audiência. Decisão baseada no guia ANPD: https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/processo-guia-orientativo-cookies-e-protecao-de-dados-pessoais.pdf

## Presença

Somente eventos reais `playing` do player interno habilitam presença. Pause, ended, waiting, error e pagehide encerram. Áudio contínuo em background permanece elegível; ocultar a aba por si só não prova pausa. Heartbeat 60 segundos, expiração lógica 120 segundos. Navegador pode atrasar timers em background, causando subcontagem; expiração impede audiência abandonada permanente. Refresh não retoma reprodução automaticamente. Spotify embed/externo e rádios externas não participam.

Contagem agrega navegadores com ao menos uma aba ativa. Público faz polling a cada 60s apenas quando visível; cache da Function 30s. Dashboard privado tem cache de 60s, sem polling agressivo. Números podem estar atrasados em até aproximadamente 90s além da validade de presença.

## Persistência e custo

Sem logs brutos infinitos: 32 documentos diários em anel e um documento de presença. Janela exibida 30 dias, unicidade 7/30 calculada por união dos hashes privados. Até 1.500 navegadores/dia/presença e quatro abas por navegador; saturação causa subcontagem, não números inventados. `audioSessions` representa navegadores com áudio confirmado no dia, não quantidade de plays; UI usa nome explícito.

Pageview: uma leitura transacional + até uma escrita. Play: duas leituras + até duas escritas (dia e presença); repetição no dia evita segunda escrita diária. Heartbeat/stop: uma leitura + uma escrita. Transações sob concorrência podem repetir leituras. Listener público: uma leitura por cache miss (30s por instância). Admin: 32 leituras de slots + uma de presença por cache miss (60s), sem mostrar hashes. Não há nova assinatura/serviço pago, mas Functions/Firestore/TTL continuam sujeitos ao billing existente; custo recorrente zero não é garantido.

Retenção preparada com `expiresAt` e políticas TTL locais em `firestore.indexes.json`, exclusivamente nas novas coleções. Configuração precisa ser implantada em uma tarefa futura autorizada, além de radarApi/Hosting. Expiração lógica independe de TTL físico; deleção TTL é assíncrona e faturável. Mapas privados excluídos de indexação. Referências oficiais: https://github.com/firebase/firebase-tools/blob/main/src/firestore/README.md e https://firebase.google.com/docs/firestore/ttl

## Segurança e limites

Dashboard verifica Firebase token revogado e UID superadmin antes de ler. Firestore rules existentes negam acesso direto a todas as coleções. Público recebe somente contador agregado. Tracking usa schema restrito, body <=512 bytes, origin allowlist e rejeição básica de bots técnicos. Rate limit por ID/tipo e máximo 100 eventos/minuto/instância; não substitui antiabuso distribuído/App Check e não prova áudio contra um cliente malicioso. Nenhum segredo ou ID persistente é registrado em logs pela implementação.

## Visual e verificação

Hero antes de HOME_TOP, editorial ~70%/Seu Radar ~30%, notícia principal dominante, secundárias em cards completos, mobile com editorial antes do lateral. Sistema tipográfico, espaçamento, foco e reduced motion. Página `/admin/analytics` lazy-loaded com cards, estado vazio, gráfico acessível acompanhado de tabela e páginas agregadas.

Testes browser usam mocks e capturam Home/History/Live/Listen/Admin em 375/390/430/768/1024/1440, sem qualquer gravação real. Capturas em `frontend/review/visual-audience/` não fazem parte de `frontend/dist`.
