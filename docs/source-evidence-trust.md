# Fonte observada e conteúdo derivado

**MODEL OUTPUT != SOURCE EVIDENCE.** `evidencias`, `evidencia` e `allowedFacts` são declarações derivadas do modelo. Não autenticam uma página.

## O que foi realmente observado localmente

Nas fixtures e no diagnóstico real arquivado, `output` contém `web_search_call` com `id`, `status`, `action.type`, `action.queries` e `action.sources[].url`. `include: ['web_search_call.action.sources']` solicita metadados das fontes. No artefato real preservado, não há texto independente das páginas. A mensagem final contém redação/citações do modelo e não é convertida em conteúdo de fonte.

O normalizador recebe somente itens da ferramenta. Preserva URL canônica, domínio, ação, estado e queries; título/ID da fonte quando retornados. Campos opcionais `snippet` e `text` só são preservados quando de fato presentes no item: seu retorno pela API atual não está comprovado nem é garantido. Ausência fica explícita, nunca preenchida com `evidenceExcerpt` do modelo.

`sourceId` usa a URL canônica como chave reproduzível, pois as fontes atuais não expõem um ID opaco próprio. O candidato deve referenciar essas chaves. ID ausente resulta em SOURCE_NOT_OBSERVED; divergência da URL resulta em SOURCE_URL_MISMATCH. Não se inventa URL nem se troca homepage por artigo presumido.

## Validação e auditoria

O fluxo de produção exige o modo de fonte observada. Todos os vínculos devem apontar para operações concluídas. Conteúdo ausente resulta em WARNING SOURCE_CONTENT_UNAVAILABLE, não bloqueante por decisão editorial. O registro indica independentlyVerified=false; isso não equivale a confirmação independente. URL observada/específica, sourceIds, fatos permitidos, contrato, duplicidade e áudio continuam obrigatórios. Quando conteúdo estiver disponível, os trechos derivados precisam ocorrer nele e os fatos permitidos mantêm as verificações determinísticas existentes. Podem existir várias fontes e vários trechos; isso não demonstra implicação semântica de toda tradução/paráfrase.

O diagnóstico consolidado guarda metadados e pequenos trechos (até 4.000 caracteres por campo, até 80 registros), hash e referências; não páginas inteiras. Secrets e parâmetros sensíveis são mascarados. IDs de ação são representados por hash curto no diagnóstico para preservar correlação sem mostrar valores opacos. Campos estruturados editoriais não são concatenados para fabricar narração: somente os blocos `roteiroAlexa` independentes formam o roteiro global.

As funções históricas de conferência via leitor explícito continuam para compatibilidade local. A Function de produção habilita obrigatoriamente `requireObservedEvidence`; não recorre automaticamente a leituras externas para preencher conteúdo ausente.

## Orçamento e áudio

`maxSearchOperations=3`; `maxOpenPageOperations=null` e `maxQueries=null` mantêm a ausência histórica de limites independentes, sem aumentar o limite `max_tool_calls=3` enviado à API. `null` não é zero. Search conta operações distintas, queries contam consultas, open_page é separado. Transições identificáveis do mesmo ID são consolidadas; ação distinta em progresso na resposta final bloqueia coleta.

Roteiro: 120–750 palavras; quando há blocos individuais, cada um tem pelo menos 25 palavras e deve estar íntegro. URLs, links markdown, `www.`, tracking e citações técnicas são rejeitados, não removidos silenciosamente. Fonte/URL ficam nos dados estruturados.

## Política para conteúdo ausente

Os artefatos atuais podem fornecer somente metadados. SOURCE_CONTENT_UNAVAILABLE é WARNING e permite continuar com as demais verificações determinísticas. Fonte inexistente, URL inválida/divergente/genérica, coleta incompleta, contradição detectável, fato fora de allowedFacts, contrato, duplicidade e roteiro inválidos continuam bloqueantes. Nenhum crawler, scraping, segunda chamada OpenAI ou busca adicional foi acrescentado.
