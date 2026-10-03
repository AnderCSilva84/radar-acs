# Geração manual — primeira fase

Function HTTPS generateRadarManual em us-east1. Sem Scheduler. POST autenticado por ID token Google e IAM, JSON com requestId (UUID v4) e confirmarPublicacao: true. Cada requestId é reservado em geracoesManuais antes de usar a OpenAI; repetir o mesmo ID retorna 409 sem nova geração. Falhas também reservam o ID. Não há retry automático de chamadas pagas.

OPENAI_API_KEY e RADAR_ADMIN_TOKEN são vinculados explicitamente em secrets da Function; lidos somente dentro da execução no Google Cloud. OPENAI_API_KEY não deve ser recuperada para máquina local, código ou .env. O administrador usa sua identidade Google para invocar a Function privada; RADAR_ADMIN_TOKEN é usado exclusivamente na publicação interna. Nunca enviar credenciais no JSON.

Modelo e limites: api/generator-config.json, padrão gpt-5.4-mini, timezone America/Belem, até 12.000 tokens de saída e 3 tool calls; timeout OpenAI 420 segundos, Function 540 segundos. O limite de tokens inclui raciocínio. Não há SDK novo: fetch nativo usa Responses API, web_search com external_web_access true, store false e JSON Schema estrito. Uma execução do gerador faz uma chamada Responses, que pode realizar várias buscas. A web é pesquisada de fato: sem web_search_call concluído, publicação é rejeitada.

Validação adicional: data atual em Belém, título esperado, cinco URLs distintas presentes nas fontes/citações da ferramenta, dataPublicacao declarada e dentro da janela de três dias, roteiro com alvo de 450–650 palavras (tolerância técnica de 400–750) sem SSML/URLs/citações, mais toda a validação existente e limite SSML. As datas e o conteúdo semântico ainda dependem da interpretação das fontes pelo modelo: validação técnica não garante factualidade. A revisão humana da primeira edição é obrigatória antes de qualquer agendamento. A duração depende do roteiro; estimar a 130–150 palavras/minuto e medir no Echo.

Publicação chama a mesma publishBriefing() agora empacotada em api/publish-briefing.js; services/publish-briefing.js reexporta essa função para preservar script e consumidores locais. Mantém POST → validação → transação Firestore → GET → Alexa. Não há mudanças nos arquivos Alexa.

Resposta manual inclui data, as cinco notícias e métricas permitidas. Logs incluem modelo, tokens (quando informados), quantidade de buscas e duração; não incluem resposta bruta, prompts ou chaves. Estimativa em USD usa preços configurados, incluindo tokens de raciocínio no total de saída e chamadas search. É uma estimativa, sem impostos, câmbio ou custos Firebase; buscar/abrir páginas pode ter contabilização de ferramentas diferente da quantidade de itens. Conferir consumo no painel OpenAI. Modelo diferente requer atualização da tabela de preços; caso a resposta indique outro modelo, estimativa retorna null.

Deploy somente do gerador: firebase deploy --only functions:generateRadarManual --project radar-acs. Nenhuma geração ocorre durante deploy ou importação de módulos. Function privada (invoker private): Cloud Run verifica ID token e permissão IAM antes de executar o handler. A entrada não verifica o token Radar. Concurrency e maxInstances iguais a 1 limitam paralelismo; isso não é quota diária. O endpoint não é para frontend e cada invocação autorizada com ID novo pode gerar cobrança. Não ativar agendamento nesta fase.

Em timeout ou falha, não repetir com ID novo sem conferir geracoesManuais e GET: a publicação pode ter sido concluída antes da perda da resposta. O registro pode ficar iniciada após término forçado e não será retomado automaticamente. O estado concluida inclui métricas e cinco notícias para diagnóstico sem nova geração. Se falhar a gravação de estado depois da publicação, o cliente recebe erro, mas o briefing publicado pode já ter mudado.

Referências: [modelo](https://developers.openai.com/api/docs/models/gpt-5.4-mini), [web search e fontes](https://developers.openai.com/api/docs/guides/tools-web-search), [saída estruturada](https://developers.openai.com/api/docs/guides/structured-outputs), [preços](https://developers.openai.com/api/docs/pricing).

## Diagnóstico e retenção (alterações locais ainda sem deploy)

Veja [DIAGNOSTICO-GERADOR.md](DIAGNOSTICO-GERADOR.md). Etapas e exceções passam a ser registradas com redação de credenciais. O resultado estruturado é salvo antes da validação em geracoesDiagnostico por sete dias, com limpeza manual explicitamente executada e sem Scheduler. A reserva atômica elimina a leitura prévia e preserva idempotência. Nenhuma nova geração foi realizada nesta revisão.

## Segunda tentativa controlada

Uma chamada Responses, sem retry; web_search com contexto low e até três chamadas de ferramenta complementares. Raciocínio low e orçamento de 12.000 tokens de saída preservados. O snapshot permanece GENERATED_NOT_PUBLISHED como registro da etapa anterior à publicação; geracoesManuais registra concluida/falhou, evitando escrita adicional no snapshot. Retenção de sete dias com limpeza manual explícita.

## Revisão local vigente após a terceira tentativa

As regras atuais locais estão em [PIPELINE-3-A-5.md](PIPELINE-3-A-5.md): contrato 3–5, roteiro por candidato, remoção segura, evidência reforçada e instrumentação de chamadas. As descrições anteriores de cinco notícias são histórico das primeiras tentativas. Nenhum deploy desta revisão foi executado.
