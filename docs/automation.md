# Automação diária — hotfix de orçamento web

Projeto radar-acs, Scheduler às 08:00 America/Belem. Manual e Scheduled
continuam usando generateRadarEdition, com o mesmo prompt, fontes e modelo.

Ações internas web_search são telemetria, nunca gate de publicação.
WEB_SEARCH_BUDGET/WEB_TOOL_BUDGET_EXCEEDED não abortam respostas pagas.
Mantém-se max_tool_calls=3 solicitado à API; não há limite posterior arbitrário.
Ações searching ou auxiliares incompletas produzem aviso quando há saída
utilizável. URL deve continuar associada a uma fonte coletada em ação concluída.
Contrato, fonte, conteúdo utilizável, duplicidade e roteiro continuam validados.
Uma a cinco notícias válidas permitem publicação; zero encerra com falha.
FACTUAL_EVIDENCE permanece fora do motor como gate.

Retry automático DESATIVADO. Uma execução diária, no máximo uma chamada OpenAI.
policyVersion=3: claim transacional verifica edição e reserva. PUBLISHED ou
edição existente bloqueiam geração; RUNNING recente bloqueia concorrência.
Uma tentativa consumida impede outra chamada, mesmo após FAILED/lease vencido.
Diagnóstico não libera o lease; finishAttempt verifica publicação antes de
marcar PUBLISHED/FAILED, inclusive após falha de transporte/diagnóstico.

Migração única autorizada: FAILED anterior pode usar uma tentativa da política
nova. Não apaga legacyIncident, attemptResults nem flags dos recoveries antigos.
Novos resultados usam chave v3-1, preservando as tentativas anteriores. O teste
real de 04/10 é POST normal ao Scheduled, sem recovery nem retry.

Numeração continua derivada de latest; create-only protege data e número.
Contexto eleitoral de 04/10 e proteção Alexa para edição antiga permanecem.
IAM/OIDC/cron/timezone não são alterados. Se invoker desaparecer, parar.
