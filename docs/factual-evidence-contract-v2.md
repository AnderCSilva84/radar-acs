# Factual Evidence Contract V2

Referências de cada campo formam uma partição literal ordenada do texto. Um parágrafo pode conter várias referências. Entre segmentos, somente whitespace é permitido; omissões, sobreposições, duplicações, reordenação e segmentos não literais são rejeitados. IDs devem existir nas evidências do candidato. Texto das matérias nunca é reconstruído ou alterado para satisfazer cobertura.

As regras posteriores permanecem: ancoragem lexical mínima de 0,55 por referência; números/identificadores presentes nas evidências; nomes reconhecidos; preservação de negação e modalidade. A auditoria opcional acumula falhas por regra, sem interromper a execução na primeira falha factual. Uma falha continua impedindo aprovação da matéria.

Essas regras são heurísticas conservadoras, não equivalem a prova semântica. Traduções (AI/IA), palavras iniciais maiúsculas e expressões como “previsto na MP” podem causar falsos positivos. Nenhuma dessas regras foi relaxada nesta tarefa. Rejeições são resultados do validador, não afirmações conclusivas de falsidade.

Revalidação offline da resposta paga preservada: sete matérias, uma aprovada, seis rejeitadas. Textos e arquivos originais preservados por comparação de SHA-256 antes/depois. Nenhuma nova chamada OpenAI, coleta, escrita remota, publicação ou deploy.

Testes: 329 aprovados. Resultado detalhado local: `.local-factual-contract-v2-revalidation.json`. Executor offline: `scripts/revalidate-factual-v2.cjs`.
