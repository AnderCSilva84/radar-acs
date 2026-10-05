# Interpretação do orçamento web

`web_search_call` identifica item de ferramenta; `action.type` distingue search de open_page. `status` informa o estado (completed, searching ou in_progress). `action.queries` pode conter várias consultas em uma operação e não é orçamento de chamadas. Uma search ainda em progresso não é descrita como concluída, mas também não é ignorada: é uma operação solicitada observada.

Para não contar um evento intermediário duas vezes, a classificação local consolida estados diferentes do mesmo ID e tipo, quando um estado é completed. Queries repetidas dessa transição são reunidas. IDs diferentes identificam operações distintas. IDs mascarados, ausentes ou duas entradas completed não comprovam uma transição; não se deduz identidade por texto de query ou por suposição. A contagem é conservadora nesses casos. Os limites continuam em três operações; open_page fica separado.

Na execução preservada `2334c703-5da9-445f-ad93-e60ac5c0dc5f`, a métrica calculada antes da sanitização registra quatro IDs distintos. As três searches completed e a quarta searching apresentam conjuntos diferentes de queries. Não há comprovação de que a quarta represente uma das três anteriores. O bloqueio permanece; quatro ações solicitadas observadas não significam quatro pesquisas concluídas.

O artefato não contém o conteúdo independente das páginas: os trechos e allowedFacts são saída do modelo. A revalidação offline não transforma essas declarações em prova de autenticidade. O módulo de revisão não recebe dependência de publicação ou rede e sempre desabilita publicação para revisão humana. Páginas genéricas não ganham URL específica por inferência; somente parâmetros utm e fragmentos podem ser removidos deterministicamente.
