# Coleta web auxiliar incompleta

O incidente de 04/10/2026 tinha três pesquisas concluídas e uma operação
`open_page` não concluída. A verificação anterior interrompia a execução
antes da análise dos quatro candidatos. O diagnóstico agregado não preservou
o ID nem o status exato desse item; não é possível recuperar esses detalhes.

O orçamento continua limitado a três operações de pesquisa. Metadados
desconhecidos e excesso de orçamento continuam fatais. Uma ação auxiliar
pendente gera `WEB_COLLECTION_INCOMPLETE_WARNING` somente após interpretar
com segurança a resposta concluída e encontrar de um a cinco candidatos.
JSON corrompido, saída incompleta ou ausência de candidatos continuam fatais.

Somente fontes de ações concluídas alimentam a validação factual. URLs
inválidas ou não observadas rejeitam o candidato correspondente. Nenhuma
ação pendente serve como evidência. Os candidatos restantes passam pelos
mesmos controles factuais, roteiro, contrato, duplicidade e publicação.
Zero candidatos aprovados impede publicação. Não há retries, pesquisa extra,
segunda chamada de IA nem reconstrução de texto por IA.

O diagnóstico técnico consolidado registra ações/status e códigos de motivo,
sem armazenar a resposta completa da IA. Continua sendo uma persistência
consolidada por execução. SOURCE_CONTENT_UNAVAILABLE permanece aviso explícito,
sem alegar verificação independente do conteúdo ausente.

O invoker declarado de generateRadarScheduled corresponde exclusivamente ao
binding existente da service account radar-scheduler no projeto radar-acs.
Isso evita que o deploy declare uma lista vazia de invocadores. A política
efetiva deve ser conferida após cada deploy; não há restauração automática.
