# Evidence-grounded writing V1 — teste local

Foi acrescentado somente um contrato de redação ao prompt de `buildWritingRequest`. O schema existente continua associando `field`, `segment` literal e `evidenceIds`; suporta múltiplos segmentos por parágrafo. Não foram alterados `validateWriting`, `factual-calibration.js`, ranking, coletor, configurações de modelo ou validadores posteriores.

O contrato orienta seleção de referências antes da redação de cada claim, paráfrase conservadora, preservação de entidades/ações/quantidades/qualificadores, negação e modalidade, sem inferência ou preenchimento artificial. Isso é instrução ao modelo; não prova que seu processo interno seguiu essa ordem. A cobertura continua sendo verificada pelo validador existente. Referência consultada: [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses).

## Execução única

- Projeto confirmado: radar-acs, 596095541153.
- 369 testes offline aprovados: 363 anteriores + 6 do contrato.
- Pool de 06/10/2026 reutilizado dentro da janela vigente de três dias: 11 válidos, 7 selecionados com preferências atuais. Nenhuma nova coleta editorial.
- Uma chamada Responses API, sem ferramentas e sem retry. Modelo configurado gpt-5.4-mini; resposta gpt-5.4-mini-2026-03-17.
- Input 3.581; output 3.758; reasoning 59 (incluídos em output); total 7.339. Custo estimado US$ 0,019597 pelas tarifas já configuradas. Duração 14,2s.
- Resposta paga preservada em `.local-evidence-grounded-v1-paid.json` antes da validação. Guard local `.local-evidence-grounded-v1-attempt.json` impede repetição automática.
- Diagnóstico completo `.local-evidence-grounded-v1-report.json`: 3 PASS, 4 FAIL, resultado REDUCED.

## Bloqueios preservados

- Ferraresi: `Com isso, Tite ganha mais uma opção para a zaga.` — ancoragem 0,50, abaixo de 0,55.
- Representação parlamentar: uma claim tem ancoragem 0,4286; a claim falada com `não é o principal ponto` também falha na comparação de negação com o trecho selecionado pela heurística existente.
- ReviewBench: tradução de frases inglesas continua sem cobertura lexical suficiente; uma referência da fala não contém AI/IA, acionando identificador. Não foi acrescentada tradução específica nem corrigida referência.
- Chuvas: `prevê` na claim versus `previstos` na evidência produz discrepância na modalidade detectada pela regra existente. Isso é um ponto diagnóstico da regra, não uma conclusão de que a previsão é factualmente falsa. Conforme o escopo, o validador permaneceu intacto.

Não foram reescritos ou corrigidos textos após a resposta. Os antigos arquivos pagos e seu relatório preservaram seus hashes.

## Métricas editoriais

Somente as três matérias aprovadas: 276 palavras editoriais (92/matéria), 155 palavras faladas (51,67/matéria), aproximadamente 67 segundos. São estatísticas dos resumos aprovados; não foi gerado roteiro final nem preview PWA/Alexa, pois o critério exigia pelo menos cinco aprovações.

Latest foi conferido por GET HTTP 200 e hash JSON UTF-8: continua Radar ACS — Edição #005 / 2026-10-06, idêntico ao início. Zero escritas Firestore/Storage, edições novas, publicação, deploy ou alteração Alexa/Scheduler.

READY FOR EDITORIAL V2 DEPLOY: NO — apenas três das sete matérias passaram. Não executar outra chamada nesta autorização.
