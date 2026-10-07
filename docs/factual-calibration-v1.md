# Factual calibration V1 — validação local

Os sete textos pagos e suas evidências foram reutilizados literalmente. Seus hashes SHA-256 permanecem iguais aos registrados antes da calibração. Nenhuma coleta, geração, publicação, operação de banco ou deploy foi realizada.

A matriz detalhada em `factual-calibration-v1-audit.md` registra as 25 falhas antigas, com claim, referência, evidência integral, regra, diferença e classificação: 15 falsos positivos e 10 ambiguidades. Essa classificação não equivale a autorização para publicação. Há paráfrases legítimas que o algoritmo local ainda não consegue demonstrar com segurança.

## Regras generalizáveis aplicadas

- Aliases técnicos explícitos AI/IA/artificial intelligence/inteligência artificial; normalização de caixa, acentos e pontuação. Nenhum alias frouxo de pessoas, produtos ou países.
- Singular/plural de seis substantivos comuns somente para ancoragem lexical; identificadores não são singularizados.
- Pronomes comuns não são entidades. Nomes conhecidos podem ser confirmados pelo contexto de evidência do próprio candidato; isso não autoriza fatos novos. Valores e referências factuais continuam vinculados às unidades explicitamente citadas. Limites Unicode evitam fragmentar nomes acentuados.
- Operadores de negação/modalidade são comparados às frases/cláusulas mais relacionadas à claim, usando cobertura lexical mínima de 0,35 e pelo menos 80% da melhor cobertura. O teste inclui inversão real e referência negativa alheia. Trata-se de heurística conservadora, não de prova semântica universal.
- `previsto na MP/lei/decreto/norma/regulamento` significa disposição normativa; não é previsão de futuro. `previsto para amanhã` continua possibilidade. Certeza, possibilidade e obrigação não são intercambiáveis; introduzir possibilidade sem apoio também falha.
- Números e datas precisam estar nas referências citadas. A data de publicação do artigo não pode justificar qualquer data de acontecimento.
- FINAL exige PASS em todos os sete checks e ausência de exceção, incluindo validações de voz executadas depois dos checks factuais.

## Limitação mantida

A ancoragem continua exigindo 0,55 de cobertura lexical normalizada. As equivalências explicitamente seguras e as checagens independentes foram combinadas, mas não foi criado um dicionário de sinônimos ou traduções específico para fazer essas notícias passarem. Referências aleatórias, traduções não comprovadas e paráfrases ainda ambíguas continuam bloqueadas. A calibração de ancoragem é, portanto, parcial.

O resumo parlamentar também exige cautela editorial: a fala usa `metade` onde a evidência diz `cerca de metade` das candidaturas e `pouco mais da metade` da população. A matéria permanece FAIL; a validação lexical de números não prova preservação de qualificadores quantitativos. Não foi reescrito nenhum texto para resolver isso.

O arquivo preservado anterior já registrava FINAL FAIL para a matéria parlamentar; não foi encontrada a inconsistência FINAL PASS alegada. O agregador agora possui uma regra explícita e um teste que impedem PASS com qualquer check obrigatório FAIL.

## Resultado

363 testes locais aprovados, zero falhas. Das sete matérias, três passaram e quatro continuam bloqueadas na ancoragem. Não atingiu o critério de cinco aprovações: READY FOR FINAL CONTROLLED GENERATION = NO.

Arquivos desta tarefa: `api/factual-calibration.js`, `api/editorial-v2-generator.js`, `scripts/revalidate-factual-v2.cjs`, `tests/factual-calibration.test.js` e os dois documentos de calibração. Os relatórios locais `.local-calibration-audit.json` e `.local-factual-contract-v2-revalidation.json` guardam auditoria e resultados; não contêm credenciais.
