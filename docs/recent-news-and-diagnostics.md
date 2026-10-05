# Histórico recente e diagnóstico consolidado

Somente o gerador automático consulta `briefings`, filtrando `publicado=true`, ordenando `data` decrescente e usando `limit(recentEditionLimit)`. O padrão é uma edição: uma consulta, até um documento retornado e até cinco notícias. Uma consulta vazia também tem cobrança mínima de leitura. A configuração permite no máximo três edições; cada documento retornado é uma leitura, não uma leitura por consulta.

A projeção traz `data` e `noticias`, sem roteiro global. Como notícias são um array de objetos no contrato existente, a consulta também recebe seus resumos/contextos; esses textos são descartados e nunca enviados ao modelo. Evitar isso no transporte exigiria alterar o armazenamento existente. O prompt recebe apenas títulos, URLs e datas; sem histórico inteiro, embeddings ou nova chamada IA.

Repetição forte usa URL HTTPS canônica (sem fragmentos, barra final e parâmetros de rastreamento conhecidos) ou título normalizado idêntico. Parâmetros com significado são preservados. Empresa ou tema isolados não bloqueiam. Desenvolvimento novo ligado a uma URL anterior exige URL diferente, título diferente, data posterior e descrição vinculada a um fato permitido. Ele só é considerado depois de FACTUAL_EVIDENCE; isso não elimina a limitação semântica já documentada do validador. Repetições detectadas são removidas deterministicamente, mantendo mínimo de três, integridade dos blocos e vínculo da oportunidade.

O caminho de produção acumula snapshot e resultados individuais em memória e grava o documento temporário uma vez no encerramento, com status PUBLISHED ou GENERATED_NOT_PUBLISHED e TTL de sete dias. Não há escrita por candidato. O registro de controle `geracoesManuais` continua separado: criação inicial e atualização final. O antigo método `evidence` permanece compatível com consumidores locais, mas não é chamado pelo gerador de produção.

Uma falha tratada de validação ou publicação preserva a resposta e diagnósticos consolidados. Limitação técnica: encerramento abrupto do processo antes do bloco final pode perder o buffer; uma escrita antecipada seguida de consolidação exigiria duas escritas. Falha na escrita final não é repetida automaticamente. Se ocorrer depois da publicação, o briefing pode já estar publicado e o handler informa falha; conferir o registro de execução antes de qualquer nova tentativa.

Nenhuma leitura ou escrita real é executada pelos testes desta mudança. O fluxo editorial/manual não consulta histórico nem executa conferência factual automática.
