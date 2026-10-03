# Recuperação determinística da segunda geração

Execução: `680fffc8-61b6-4131-8583-cc46743f5497`. Análise feita somente sobre a cópia local do documento Firestore já lido. Sem OpenAI, pesquisa web, publicação ou deploy.

Os assuntos “Agents da OpenAI ganham computer use e novo modelo GPT-6.1 Sol” e “GPT-6 Astra recebe modo ultrarrápido na API” descrevem acontecimentos distintos no texto preservado: novos recursos/modelo versus menor latência de outro modelo. Essa classificação editorial não comprova factualidade ou correspondência com uma entrada específica do changelog.

Existe uma URL alternativa preservada com `mw_entry=2026-09-03-3f56515da8b13ccc`, mas não existe conteúdo de fonte que a associe a um dos dois assuntos de 29/09. As páginas gerais de lançamentos também não possuem associação individual preservada. Não alterar URLs apenas para satisfazer unicidade.

A sanitização antiga apagou trechos das URLs das notícias 1, 2 e 5. Não é possível restaurá-los a partir do documento. Os dados continuam GENERATED_NOT_PUBLISHED. A revalidação falhou em `noticias.urls_distintas`; o contrato da API também rejeitou URL inválida. Há cinco itens e 499 palavras, mas isso não basta para publicar. GET final: HTTP 200, edição de teste de 02/10/2026.

Sanitização corrigida localmente: URLs públicas não sofrem a heurística genérica de comprimento; credenciais, parâmetros sensíveis, cookies, Authorization, Bearer, JWT e secrets conhecidos continuam removidos. Testes cobrem preservação de URLs longas em fontes/notícias e ocultação de credenciais. Essa correção não desfaz redações históricas.

## Proposta futura, ainda não implementada

- Separar erro de URL repetida de suspeita de duplicidade editorial. A exigência atual de cinco URLs distintas continua ativa.
- Normalizar título/resumo: minúsculas, acentos, pontuação e espaços; remover palavras funcionais comuns sem eliminar números, nomes de produto ou versões.
- Comparar os dez pares possíveis com conjuntos de palavras e similaridade de Jaccard. Títulos normalizados idênticos indicam duplicata; forte similaridade conjunta de título e resumo indica suspeita, exigindo revisão humana. Um limiar inicial como 0,8 precisa de fixtures antes de adoção.
- URL igual funciona como sinal adicional, não prova de mesmo acontecimento. URLs com entradas distintas só devem ser usadas quando a associação notícia/entrada estiver preservada na resposta.
- Não afirmar equivalência semântica só por similaridade; bloquear casos suspeitos para revisão. Sem embeddings, nova chamada IA ou consultas ao banco.

Nesta operação: zero chamadas OpenAI; zero web_search; zero leituras diretas adicionais do diagnóstico Firestore; uma leitura através do GET; zero escritas Firestore. Nenhuma fonte nova inventada.
