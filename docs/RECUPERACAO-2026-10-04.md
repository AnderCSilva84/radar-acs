# Recuperação controlada da edição de 04/10/2026

O contrato de publicação aceita **1–5 notícias**. Zero notícias verificadas bloqueia a publicação. As verificações de fontes, URL observada, allowedFacts, duplicidade, neutralidade e integridade da narração continuam obrigatórias. `SOURCE_CONTENT_UNAVAILABLE` permanece WARNING.

O roteiro continua limitado a 750 palavras. O mínimo de proteção é `min(120, 40 × notícias)`: 40 para uma notícia, 80 para duas e 120 para três a cinco. Cada bloco exige pelo menos 25 palavras, término não truncado e correspondência literal com o roteiro global. Isso é proteção estrutural, não uma meta editorial.

O endpoint privado existente `generateRadarScheduled` mantém seu POST normal e a reserva diária. Um POST IAM com `recoveryDate: "2026-10-04"` e `confirmarRecuperacao: true` permite **uma única recuperação dessa data**, somente enquanto a data editorial atual for 04/10. Não executa o Cloud Scheduler.

A recuperação transacional exige: nenhuma edição da data (inclusive draft), nenhum documento com título #003, latest exatamente #002 de 03/10, reserva existente com falha conhecida e nenhuma recuperação anterior. A reserva é atualizada, nunca apagada. A publicação usa `If-None-Match: *`; qualquer documento existente impede substituição.

A reserva legada das 08:00 não possuía status de falha. A exceção de migração é restrita ao timestamp exato da reserva `2026-10-04T11:00:03.823Z`. Sua falha foi comprovada em Cloud Logging às `2026-10-04T11:00:24.198061Z`, revision `generateradarscheduled-00001-kay`, etapa `FACTUAL_EVIDENCE`, código `INSUFFICIENT_VERIFIED_NEWS`. Nenhuma outra reserva sem status recebe essa autorização.

O agendado conecta checkpoint e diagnósticos de candidatos ao buffer consolidado. Persiste apenas contagens, data/número, métricas, status e candidateId/stage/reasonCode das rejeições. Não persiste prompt nem resposta editorial bruta. O diagnóstico e o resultado final usam **uma atualização da reserva existente** por geração. Não há retry de IA. Falhas anteriores à resposta OpenAI recebem um resumo técnico sem contagens presumidas.

Leituras de recuperação: verificação da data, quatro leituras/consultas em transação e latest. Publicação acrescenta uma leitura transacional. Escritas: uma reivindicação de recuperação, uma publicação e uma atualização consolidada da reserva, sem repetição automática.
