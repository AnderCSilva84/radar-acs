# Rodada Produto + Central Comercial (local)

## Imagens editoriais
A coleta existente reaproveita metadados recebidos de uma fonte: imagem da matéria, OG da mesma página, thumbnail/media/enclosure do feed. Não faz nova requisição, não pesquisa uma imagem substituta e não copia fotografias para Storage. `imageUrl`, `imageSource`, `imageAlt` e a aprovação editorial existente seguem até a projeção pública por whitelist. Ausência de metadados ou de aprovação mantém o fallback; uma URL pública, sozinha, não comprova autorização de uso. A resposta atual arquivada da edição #004 não contém imagem aprovada para suas notícias: os screenshots da Home mostram honestamente os fallbacks, sem associar fotografias de outra matéria.

No navegador, falha de hotlink/HTTP, imagem com menos de 320 × 160 px ou carregamento que não termina em 10 s após entrar no viewport acionam o fallback. A proporção reservada permanece constante. A aprovação continua sendo entrada editorial; não há presunção de licença nem busca/IA adicional.

## Clubes
Catálogo local estático 2026, 20 clubes em cada divisão, consultado sem rede. Fontes CBF: [Série A](https://www.cbf.com.br/futebol-brasileiro/times/campeonato-brasileiro/serie-a/2026), [regulamento Série B, participantes](https://stcbfsiteprdimgbrs.blob.core.windows.net/img-site/cdn/REC_Brasileiro_Serie_B_2026_85d55b9f72.pdf), [regulamento Série C, participantes](https://stcbfsiteprdimgbrs.blob.core.windows.net/img-site/cdn/REC_Brasileiro_Serie_C_2026_d2552ddc00.pdf). É necessário revisar o catálogo por temporada; não atualizar divisões por suposição.

IDs Radar são slugs internos, não IDs de provider. `providerIds.footballData` e `crestUrl` ficam nulos sem enriquecimento verificado. A interface usa símbolo neutro de futebol, não um escudo inventado. Reativar um clube já seguido preserva o ID e o vínculo de provider existentes. Salvar continua explícito, sem alteração do provider ao vivo.

## Comercial e compatibilidade
Anunciantes e campanhas ficam juntos em `settings/advertising`, com os mesmos limites (50 de cada tipo e documento de 100 KB). Uma leitura inicial; uma escrita por salvamento explícito, nenhuma escrita por candidato, preview ou navegação. Não existe migração em massa. Campanhas legadas continuam públicas e editáveis. Seus anunciantes são contados no dashboard; editar uma campanha vincula seus dados ao anunciante no próximo salvamento explícito.

`publicationState=draft` é privado e exige `active=false`; URLs/criativo ainda não preenchidos são permitidos somente em rascunho. Publicar exige dados completos, URL HTTPS segura, datas válidas, anunciante válido e confirmação. `active`, datas e estado derivam rascunho/agendada/ativa/pausada/encerrada. Contact/email/WhatsApp/notas e IDs de relacionamento não entram na resposta pública. Autorização no servidor por Firebase ID token + UID permanece intacta.

Upload reutiliza bucket e regras já implantados. Selecionar valida extensão, MIME, assinatura, bytes e dimensões, e cria preview em memória; não envia arquivo. Salvar faz upload quando necessário e uma escrita da configuração. Falha ao salvar preserva o rascunho e reaproveita o upload em nova tentativa manual. Não há limpeza automática que possa remover um criativo ainda referenciado. Nenhuma mudança de regras/bucket/plano nesta rodada.

## HOME_TOP e métricas
Zero campanhas elegíveis: nenhum slot. Uma: banner estático. Duas ou mais: carrossel, ordem estável por prioridade Normal/Alta/Destaque, anterior/próximo, indicadores, teclado e swipe. Publicidade permanece identificada, com proporção reservada e transição discreta. Autoplay desativado por padrão; quando ativado, intervalo padrão 8 segundos (mínimo 7), pausa por interação/foco, aba oculta e reduced-motion. Admin permite preview de campanhas ativas existentes. Não cria campanhas fictícias em produção.

Contrato opcional: `onImpression({campaignId, position})`, visibilidade mínima de 50%, uma vez por campanha na montagem; `onClick({campaignId, position})`. Nenhum coletor conectado, cookie, chamada de métricas, contagem inventada ou escrita remota. Futuramente agregar em memória e enviar lotes limitados com consentimento e retenção curta, antes de decidir qualquer infraestrutura/custo. Preview não emite métricas.

## Revisão e limites
Screenshots em `frontend/review/product-round`; nunca entram em `frontend/dist`. A prévia de dois anúncios inclui uma segunda campanha explicitamente identificada como técnica local, para verificar navegação sem cadastrar dados reais. Screenshots de notícias usam a edição arquivada intacta; a renderização de fotografias e os fallbacks são verificados por fixtures técnicas nos testes.

Somente alterações locais. Sem deploy, gravação real Firestore/Storage, chamadas OpenAI, edição nova, mudanças Alexa/APL/Scheduler/Auth/provider/Spotify.

Nas capturas de página completa, o header sticky fica temporariamente estático e o link de salto fora de tela é ocultado apenas pelo mecanismo de screenshot. Isso evita artefatos de composição do Chrome, sem alterar a aplicação ou seu comportamento de foco.
