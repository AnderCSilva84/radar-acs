# Terceira tentativa controlada

Projeto explícito: radar-acs. Implantar somente generateRadarManual; modelo gpt-5.4-mini mantido. Uma chamada Responses, até três chamadas web_search, contexto low e raciocínio low; sem retry. Nenhuma mudança na API pública, Alexa, IAM, secrets ou Scheduler.

## Validação

Duplicidade: normalização de acentos, caixa, pontuação/espaços; remoção de palavras funcionais; similaridade Jaccard de títulos e resumos nos dez pares. Rejeitar títulos normalizados idênticos, resumos quase idênticos ou forte similaridade conjunta. URL igual é sinal adicional, não prova de duplicação. Assuntos diferentes podem compartilhar página.

Factualidade: prompt exige somente fatos sustentados pela pesquisa atual, descarte de candidatos insuficientes e trecho literal original de evidência por assunto. URLs precisam constar nos resultados/fontes da pesquisa. Após validação do briefing, conferir cada trecho na URL indicada, reutilizando páginas iguais em memória. HTTPS público, sem credenciais, DNS público fixado na conexão, sem redirecionamentos, timeout e limite de bytes. Sem nova pesquisa nem chamada IA.

Uma leitura ou trecho inconclusivo bloqueia publicação na etapa FACTUAL_EVIDENCE. Produtos/modelos/versões GPT, Gemini, Claude e Llama mencionados em título/resumo precisam constar na evidência confirmada. Isso adiciona uma barreira objetiva contra invenções, mas similaridade lexical e correspondência de trechos não provam toda a semântica das notícias. Não apresentar essa checagem como garantia absoluta de factualidade; manter revisão humana e rejeitar dúvidas identificadas.

Antes de qualquer validação, o diagnóstico preserva o JSON editorial bruto sanitizado, resultado estruturado, evidências e URLs públicas. GENERATED_NOT_PUBLISHED descreve esse checkpoint; estado final permanece no registro de execução, sem escrita extra no diagnóstico. Expiração de sete dias requer limpeza manual existente.

## Custos de banco e rede

Gerador: zero leituras Firestore, três escritas (reserva, diagnóstico, resultado final). Quando publicado, API faz transação com uma leitura e uma escrita, sujeita a retries próprios do Firestore. GET final adiciona uma leitura; consultar diagnóstico para relatório adiciona uma leitura. Conferência direta lê cada URL única no máximo uma vez e para na primeira falha. Contabilizar leituras das fontes separadamente das pesquisas web e chamadas OpenAI.

Os 47 testes existentes passaram. Oito testes novos cobrem duplicidade, compartilhamento de fonte, evidência inexistente, modelo inventado, bloqueio de redes internas e preservação anterior à falha factual. Total: 55 testes, sem consumo real nos testes.
