# Diagnóstico da única execução paga e próximos passos

Nenhuma nova chamada OpenAI, pesquisa web, publicação, deploy ou mudança IAM foi executada nesta revisão. Alterações são locais. Modelo e parâmetros de busca atuais permanecem os mesmos.

## Evidência existente

RequestId: 56cada76-4a30-48f9-a6ac-2ebeb0138d11. Execução entre 03/10/2026 00:46:09Z e 00:46:51Z (02/10/2026 à noite em Belém). OpenAI respondeu com métricas: modelo gpt-5.4-mini-2026-03-17, 40.849 input tokens, 3.970 output tokens, 2.289 reasoning tokens, seis buscas, 40.113 ms. O gerador retornou 503; GET manteve o briefing anterior.

Logs históricos consultados: gerador contém somente métricas e erro genérico, sem corpo, conteúdo estruturado ou ID da resposta OpenAI. Na janela da execução, os registros disponíveis de radarApi mostram apenas GET 200 posterior, nenhum POST de publicação. Logo não há evidência de gravação do briefing. Isso não identifica sozinho a exceção: validação, parsing ou transporte anterior ao POST ainda eram possibilidades.

store: false foi enviado à OpenAI. Sem resultado ou response ID persistido, não há caminho de recuperação identificado. Não foi feita chamada de recuperação à OpenAI. O arquivo outputs/geracao-iam-validacao.json contém somente o retorno do handler e auditoria, não o resultado pago.

## Hipótese principal, não causa comprovada

Somente 1.681 tokens de saída não foram de raciocínio (3.970 − 2.289), para TODO o JSON: cinco títulos/resumos/contextos/fontes/URLs/datas, resumo geral, oportunidade e roteiro. É plausível que o roteiro tenha ficado abaixo de 650 palavras. Uma fixture com 302 palavras reproduz exatamente o caminho de falha antes da publicação: BRIEFING_VALIDATION, ValidationError, AUDIO_SCRIPT_INVALID, roteiroAlexa.palavras_ou_marcacao. Não usamos essa fixture como prova do conteúdo real perdido.

Outra condição reproduzida: URL editorial acrescida de parâmetro que não aparece na fonte coletada é rejeitada. A validação usa comparação exata após remover fragmento; não foi relaxada para aceitar fontes inventadas. Sem texto pago não é possível escolher definitivamente entre essas causas.

## Observabilidade implementada

Etapas OPENAI_REQUEST, OPENAI_RESPONSE_PARSE, STRUCTURED_OUTPUT, BRIEFING_VALIDATION, PUBLICATION e FIRESTORE_EXECUTION_LOG. Log e registro de falha incluem etapa, name, message, code, tipo, tipoExcecao, validacao e status HTTP quando disponíveis, além de causa encadeada limitada a dois níveis. Nunca serializar stack, request/response, SDK config ou headers.

Redação remove os valores reais dos dois secrets fornecidos apenas em memória, cabeçalhos Authorization, Bearer, ID tokens, padrões de API key e valores opacos longos. Resultado diagnóstico usa lista explícita de campos editoriais e limites de tamanho; campos extras são descartados. A exceção não é retornada em HTTP público: mensagem permanece genérica. Erros de transportes encapsulados preservam causa para diagnóstico seguro.

## Retenção do resultado pago

Na Function, antes de validar ou publicar, salvar uma única vez geracoesDiagnostico/{requestId}, com status GENERATED_NOT_PUBLISHED, resultadoEstruturado, URLs das fontes, métricas, responseStatus/responseId se existentes e expiresAt de sete dias. JSON malformado tem texto redigido e limitado para análise; não é automaticamente publicável. Retenção serve para diagnóstico e eventual reparo local, não habilita republicação automática. A data deve ser validada novamente antes de qualquer reutilização autorizada.

O status do snapshot descreve o instante antes da publicação. O estado final fica em geracoesManuais/{requestId}; não fazer escrita adicional só para mudar o status do snapshot. Se salvar o diagnóstico falhar, NÃO publicar. Um timeout antes do checkpoint ainda pode perder o resultado; a melhoria não garante recuperação de respostas que não chegaram ao backend.

expiresAt não apaga documentos sozinho. Política simples: executar limpeza manual em lotes até esvaziar os expirados, sem Scheduler e sem criar IAM. scripts/cleanup-generator-diagnostics.js usa ADC Google já autorizado, exige --project radar-acs, consulta no máximo 25 documentos expirados; simula por padrão e só remove com --delete. Não foi executado. Exemplo: node scripts/cleanup-generator-diagnostics.js --project radar-acs; após revisão, adicionar --delete. A limpeza remove somente geracoesDiagnostico; preserva registros de execução e o bloqueio de replay. Firestore TTL pode substituir o script no futuro mediante autorização separada; não foi configurado.

## Os 40.849 tokens de entrada

Medição LOCAL por caracteres do pedido antigo: instrução de sistema 383 caracteres; instruções editoriais 1.687; JSON Schema 695; request JSON completo 3.150. Não temos tokenizer exato do modelo nem decomposição por tool turn na usage; contagem por caracteres é apenas heurística.

Estimativa aproximada: sistema 100–160 tokens; editorial 450–750; schema 180–300; envelopes/definições de ferramenta e overhead variável não mensuráveis exatamente. Total local plausível 800–1.500 tokens. Não houve histórico de conversa, previous_response_id, arquivos ou leitura Firestore enviados ao modelo. Os aproximadamente 39.349–40.049 tokens restantes (96–98%) são atribuíveis principalmente ao contexto de busca e à orquestração/histórico dos tool turns, com overhead interno não separável. Não é possível dizer quantos vieram de cada URL ou busca. search_context_size medium e seis buscas explicam a oportunidade de redução; não provam a distribuição exata.

Custo estimado anterior: input US$ 0,03063675 + output US$ 0,017865 + buscas US$ 0,06 = US$ 0,10850175. A ferramenta respondeu por aproximadamente 55% do total, input 28%, output 16%. Sem impostos, câmbio ou Firebase. Mesmo que o JSON editorial seja curto, o contexto de busca pode ser extenso e repetir evidências.

## Proposta concreta de redução, ainda não ativada

Manter gpt-5.4-mini e UMA chamada Responses por edição. Próximo experimento autorizado: search_context_size low, max_tool_calls 3 em vez de 8; pedir duas ou três consultas complementares focadas em tecnologia e Brasil, evitar nova busca só para reescrever o roteiro e evitar abrir artigos além do necessário. Selecionar cinco assuntos a partir das fontes já obtidas. Não baixar qualidade nem aceitar notícia sem fonte para cumprir limite: se faltarem evidências, falhar sem publicar e sem retry.

Condensar prompt sem remover requisitos, eliminar repetições e manter schema mínimo. Não adicionar histórico de briefings inteiro ao prompt; quando deduplicação for implementada, fornecer só URLs/títulos recentes estritamente necessários. Manter raciocínio low por enquanto e aumentar a ênfase no orçamento reservado ao texto editorial; não trocar modelo. max_output_tokens não limita input ou gasto total; limites de ferramentas também não garantem teto de tokens/contexto.

Meta de ensaio, não garantia: 8–12 mil input tokens, duas/três buscas e cerca de quatro mil output tokens. Exemplo com 12 mil input, 3.970 output e três buscas: aproximadamente US$ 0,056865 (48% abaixo da execução anterior). Medir somente numa próxima geração expressamente autorizada, não nesta revisão. Narrativa de cinco assuntos ainda precisa de pelo menos 650 palavras e respeitar SSML; não reduzir texto a ponto de reproduzir a falha provável.

## Firestore: mínimo com confiabilidade

Antes: registro de execução = 1 leitura + 2 escritas (reserva transacional e conclusão/falha). Agora: 0 leituras prévias + 2 escritas (create atômico e conclusão/falha); ALREADY_EXISTS bloqueia replay sem executar IA. Acrescenta 1 escrita necessária para não perder o resultado pago antes de validar. Caminho com resposta recebida: 0 leituras de registro + 3 escritas; falha antes da resposta: 0 leituras + 2 escritas. Reservas duplicadas podem falhar sem efetivar escrita; não confundir isso com medição de cobrança.

Registro permanente de sucesso guarda apenas data/métricas, sem duplicar as notícias já gravadas no briefing. Não eliminar a reserva: isso arriscaria cobrar duas vezes a mesma requisição. Não eliminar a conclusão/falha: isso ocultaria resultado e dificultaria recuperação. O POST de publicação preserva sua transação (uma leitura e uma escrita, sujeitas a retries) e validação; não foi alterado para economizar à custa do briefing anterior. Um único GET após publicação basta para auditoria, acrescentando aproximadamente uma leitura. Limpeza diagnóstica gera leituras/deleções somente quando executada; sete dias de retenção não são custo zero.
