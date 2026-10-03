# Pipeline local: três a cinco assuntos

Esta rodada não executou OpenAI, web_search paga, consultas a fontes de notícias, publicação, deploy Firebase/Amazon ou operações Firestore. Consultas externas limitaram-se à documentação técnica pública da Amazon. A terceira geração permanece GENERATED_NOT_PUBLISHED e não foi reparada. Não houve alteração de IAM, secrets, Scheduler ou frontend.

## Contrato e remoção

API/publicador aceitam 3–5 notícias, numeradas de 1 a N. Com menos de três, bloqueiam. Exemplo de teste existente com quatro notícias que antes precisava ser rejeitado foi atualizado para rejeitar duas, pois o contrato mudou explicitamente; os outros casos existentes foram preservados.

O novo schema solicita roteiro independente por notícia, evidência literal, termos específicos, oportunidade e posição à qual ela pertence. O código deriva data/título da edição, ordem, resumo e roteiro global. Mantém leitura de respostas legadas para diagnóstico/testes.

Factualidade é avaliada para todos os candidatos, uma leitura por URL única, inclusive com cache de falha em memória. Depois, somente os aprovados são retidos. Com três ou mais, remover os blocos inválidos, manter literalmente os restantes, renumerar, reconstruir resumo somente dos resumos preservados e revalidar o briefing completo. Uma oportunidade vinculada ao assunto removido bloqueia recuperação.

Roteiro global legado sem vínculo explícito, divergência entre global e blocos ou referências cruzadas dependentes também bloqueiam. Não inferir qual parágrafo pertence a qual notícia; não reescrever com IA nem completar quantidade. Duplicidade editorial forte bloqueia a edição, enquanto URL compartilhada por acontecimentos distintos pode passar.

Alvo: 90–130 palavras por assunto (450–650 para cinco). Limite técnico mínimo de 80 por assunto, máximo de 750 no total e limite SSML existente. A abertura Alexa não anuncia mais cinco assuntos. Nenhuma alteração foi publicada no runtime atual.

## Factualidade

Trecho literal deve constar no conteúdo recuperado. Produtos/modelos conhecidos, versões, termos específicos declarados, preços e datas precisam aparecer na evidência; disponibilidade, anúncio e API exigem linguagem explícita de apoio. Evidência especulativa não comprova fato específico. Categorias/listagens e comunidades são recusadas como evidência primária de afirmações específicas. Prioridade editorial: documentação/changelog/blog/produto oficiais, depois jornalismo confiável para contexto.

Não há equivalência semântica perfeita por regex. Essas regras são conservadoras e podem rejeitar traduções/formatações legítimas. A presença de trechos não é prova universal de toda interpretação; revisão humana continua necessária. Nenhuma nova fonte foi consultada para recuperar a terceira edição.

## Quatro buscas observadas: o que sabemos

O código histórico contava a quantidade de itens `output` cujo type era web_search_call e action.type era search. Não contava o tamanho de queries. Um mock com um item e quatro queries retorna uma chamada, não quatro. O valor histórico 4, portanto, representa quatro itens, segundo essa métrica.

O diagnóstico antigo preservou métricas, URLs e JSON editorial, **não** a lista completa de ações/IDs de ferramentas. Não é possível descobrir, a partir dele, se houve IDs repetidos, ações internas ou outra divergência da API. As notas locais só registram max_tool_calls=3 solicitado e quatro itens observados. Não atribuir causa sem dados. Também não confundir contagem local com a cobrança definitiva do fornecedor.

Nova instrumentação preserva IDs/estado/tipo de ação, queries disponíveis, número de itens, IDs distintos, quantidade de queries quando informada e limite solicitado, no mesmo diagnóstico existente. Metadados ausentes ficam null. Acima do limite observado, WEB_SEARCH_BUDGET bloqueia publicação após preservar a resposta, sem retry. Isso **não impede o custo já incorrido** e não permite garantir exatamente três pesquisas internas antecipadamente numa única chamada Responses.

## Custo

Modelo, reasoning low, contexto low, uma chamada Responses e ausência de retry preservados. O pedido compacto tem 3.603 caracteres: instruções 696, input 1.748 e schema 777 (não são tokens). Não pede data/título/ordem/resumo/roteiro global redundantes nem justificativas longas. Evidências foram mantidas. Não usar parâmetros inventados para limitar reasoning.

Na terceira execução, reasoning consumiu 3.496 dos 5.229 output tokens, cerca de 66,9%; saída visível restante: 1.733. A maior variação de custo veio de reasoning/output e da quarta pesquisa, enquanto input ficou próximo à segunda tentativa. Prompt/schema mais diretos e 3–5 assuntos sem preenchimento são medidas seguras; não prometem um número específico de reasoning tokens. Reduzir drasticamente max_output_tokens poderia truncar uma resposta paga e não foi feito.

Banco futuro: reserva, diagnóstico e conclusão/falha continuam três escritas, zero leituras do gerador. Recuperação usa o resultado em memória; não cria coleção ou escrita extra. Publicação válida mantém a transação existente. O diagnóstico guarda a versão original anterior à validação e a execução relata removidas/resultado final. Nenhuma operação de banco ocorreu nesta rodada.

## Validação local

73 testes aprovados: 55 casos anteriores adaptados somente onde o contrato mudou, mais 18 novos. Cobrem três/quatro/cinco válidas, mínimo não atingido, remoção literal, falha de oportunidade/referência cruzada, fontes insuficientes/genéricas/secundárias, especulação, fontes compartilhadas, duplicidade, orçamento de ferramentas e Custom Task. Todos usam mocks, sem IA ou leitura real de fontes.

## Arquivos desta rodada

Alterados: api/validation.js, api/generator.js, api/source-evidence.js, api/diagnostics.js, api/playback.js, lambda/index.js, lambda/playback.js, skill.json, tests/generator.test.js, tests/publication.test.js, tests/skill.test.js, README.md e docs/GERACAO-MANUAL.md.

Criados: api/briefing-recovery.js, tasks/OuvirBriefingHoje.1.json, examples/alexa-custom-task-request.json, tests/partial-briefing.test.js, docs/PIPELINE-3-A-5.md e docs/ALEXA-CUSTOM-TASK.md.
