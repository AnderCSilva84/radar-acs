# Editorial V2 — implementação local

Não houve deploy, geração OpenAI real, publicação ou escrita no Firestore nesta tarefa. Fixtures são inventadas exclusivamente para testes e nunca devem ser publicadas.

## Pipeline e contratos

Os gatilhos existentes continuam chamando `generateRadarEdition`: perfil → histórico compacto → coletor → normalização/evidência → deduplicação → ranking → seleção → uma chamada Responses sem ferramentas → validação da redação → contrato/voz → publicador existente. Sem retry, busca pelo modelo, serviço pago novo ou alteração de cron/IAM/Skill.

`editorial-v2-config.json` centraliza pesos e limites: pool desejado 12–20; até 60 itens descobertos em memória; edição 1–7, alvo normal 5–7. Falta de conteúdo nunca autoriza inventar ou pesquisar outra vez pela IA. Zero candidatos cancela antes da chamada. Três/quatro registram `EDITORIAL_REDUCED`; um/dois registram `EDITORIAL_SHORTAGE`. O diagnóstico informa todos os filtros que explicam a redução. Falha de redação/contrato cancela a publicação inteira, preservando a edição anterior e a resposta paga no diagnóstico consolidado.

O contrato 1–7 foi atualizado na validação/publicação/API. Histórico compacto inclui as sete matérias da última edição, aproveitando a consulta já feita pelos gatilhos. O limite de histórico continua uma edição, sem consulta adicional.

## Coleta econômica e fontes

Registro interno `editorial-sources.json`, separado do bundle público, usa IDs do catálogo atual (`botafogo`, `remo`). Fontes de descoberta e hosts são permitidos explicitamente. Não há construção de URL por nome de clube, busca genérica por “remo”, crawler recursivo ou página fornecida pela IA. Links de matéria/feed precisam vir do documento efetivamente obtido e permanecer no host permitido. Redirects são rejeitados; indisponibilidade e orçamento esgotado entram no diagnóstico, sem repetição automática.

Fontes verificadas em 06/10/2026, apenas para configuração do catálogo:

- [Google AI](https://blog.google/innovation-and-ai/technology/ai/), [GitHub Blog](https://github.blog/latest/), [Agência Brasil](https://agenciabrasil.ebc.com.br/), [MTE](https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/servidores/concursos), [INMET](https://portal.inmet.gov.br/).
- Botafogo: [GE específico](https://ge.globo.com/futebol/times/botafogo/) e [site oficial](https://botafogo.com.br/), já identificado pelo registro de escudo oficial existente.
- Clube do Remo: [GE específico](https://ge.globo.com/pa/futebol/times/remo/) e [site oficial](https://clubedoremo.com.br/). `/remo/` genérico não foi cadastrado.

Essas consultas de verificação de endereço não foram coleta para uma edição. A coleta ponta a ponta foi exercitada com fixtures; disponibilidade de feeds, marcação HTML e cobertura diária ainda precisam de teste controlado, sem garantia de que todo site forneça 12–20 candidatos em qualquer dia. Clubes sem fonte verificada não recebem URLs inventadas.

O coletor prioriza RSS/Atom realmente anunciados pela fonte; depois metadados JSON-LD e links específicos. Só busca um artigo quando data/evidência do feed não bastam. Máximo de 8 documentos de descoberta, 8 artigos adicionais e 16 requisições totais, incluindo feeds anunciados, em até 90 segundos. Resposta limitada a 2 MiB. Cache em memória por uma hora, limitado às páginas de descoberta/feeds; textos completos de artigos não são persistidos. Uma requisição de feed pode produzir diversos candidatos: o teste produz 12 com uma requisição.

Fonte quebrada/HTML dinâmico sem metadados não autoriza simular notícia. Datas ausentes não são substituídas pela data de execução. `ARTICLE_URL` ainda precisa passar conteúdo/data; `GENERIC_LISTING` é rejeitada como matéria, incluindo `/news/`, `/latest/`, `/noticias/`, `/home/` e páginas dos clubes. Documentos institucionais específicos são aceitos quando têm evidência e data, sem exigir um slug jornalístico. Não há espelhamento de reportagem ou download de imagem para Storage.

## Evidência e limite de confiança

Cada candidato mantém até seis frases completas e 1.400 caracteres de evidência, data, origem e URL. Mínimo conservador de 25 palavras e cobertura textual do título; ausência de evidência rejeita antes da IA. Apenas os até sete selecionados são enviados ao modelo, não o histórico integral nem o pool inteiro.

Cada parágrafo editorial e frase falada deve indicar os IDs das evidências que o sustentam. A validação confere IDs, cobertura integral dos segmentos, sobreposição textual conservadora e números/siglas/identificadores. Bloqueia alteração de negação e remoção de qualificadores de possibilidade. Título, data, fonte, categoria e URL são metadados do coletor, não campos reescritos pelo modelo. Conteúdo recebido é tratado como dados, nunca instruções.

Esta validação barata não é prova semântica universal: paráfrases podem ser rejeitadas conservadoramente e uma sobreposição lexical, sozinha, não prova todas as relações causais. Não há embeddings ou segunda IA. A revisão humana do próximo teste controlado deve avaliar factualidade e qualidade; não confundir disponibilidade de URL com evidência completa.

## Ranking e perfil

Score configurável: alta 60, média 35, baixa 10; desligada excluída na coleta elegível e no ranking, sem exceção automática. Somam-se atualidade (0–12), fonte (0–9), evidência (0–6), URL específica (5), relevância geral documentada (0–6) e time seguido (15). Categorias já selecionadas recebem penalidade progressiva de 15 para favorecer variedade, sem cotas obrigatórias. Empresa/tema recorrente com matéria e título novos não é automaticamente duplicado.

Diagnóstico registra hash curto do perfil aplicado, prioridades, contagens por categoria/prioridade, candidatos dos times, razões de exclusão, score/componentes, score de seleção e decisão por candidato. Os metadados dos times são internos; o PWA continua usando o catálogo de clubes existente.

## PWA, voz, feed e persistência

`editorialSummary` preserva normalmente 2–4 parágrafos quando sustentados; pode ser menor se a evidência limitar. PWA usa `editorialSummary → resumo`, sem CSS novo. `speechSummary` é independente, mais curto e ancorado nas mesmas evidências. O renderizador do backend prefere esse campo e constrói `roteiroAlexa` compatível com a Skill atual; nenhum arquivo Alexa foi modificado. Abertura, voz, APL e configuração permanecem iguais. Nenhum mínimo global artificial de duração; limites de voz existentes continuam protegidos e nenhuma matéria pode perder o bloco falado nesta V2.

Metadados de imagem/OG/feed passam pelo sistema existente de proveniência/aprovação; imagem ausente mantém fallback e não elimina notícia.

Até 13 candidatos válidos não selecionados podem ficar em `feedCandidates` no mesmo diagnóstico para futuro “Mais para você”/“Do seu time”. Não há interface, endpoint, polling ou chamada IA adicional para esse feed. Conteúdo de evidência permanece interno; projeção pública expõe apenas campos editoriais aprovados.

Uma persistência consolidada de diagnóstico por execução. Não há leitura/escrita por candidato. Em falha posterior à resposta, `GENERATED_NOT_PUBLISHED` guarda resposta sanitizada e pool limitado para recuperação. Sucesso guarda diagnóstico técnico e extras limitados, sem resposta bruta inteira. Mantém o armazenamento dos registros existentes; nenhuma nova política remota de retenção, TTL ou Scheduler foi criada. Leituras/escritas adicionais de Firestore: zero; tamanho do registro pode aumentar. Guardas/reservas/transações/publicação existentes são preservadas.

## Testes e execução posterior

`npm test` bloqueia `global.fetch` real. O harness legado em `tests/helpers/legacy-generator.js` exercita respostas pagas históricas e não é importado por produção. O motor V2 tem testes próprios de coleta/ranking/redação/publicação simulada. `node scripts/dry-run-radar.js` usa exclusivamente mocks e imprime seleção auditável de sete matérias. Frontend e Playwright cobrem parágrafos, fallback legado e sete notícias em 375/390/430/1280 px.

Na primeira rodada, o dry run legado ainda não injetava o coletor V2 e tentou leituras HTTP públicas antes de falhar, sem chamada OpenAI/publicação/escrita real. Esse isolamento foi corrigido e a suíte final roda com bloqueio de rede real.

A chamada Responses mantém o modelo configurado; usa [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses), `tools: []` e `tool_choice: none`. Normalmente uma chamada; zero quando não há candidato válido. Requisições às fontes públicas não têm taxa de API paga nova. Desaparece a tarifa de `web_search` da geração, mas tokens, CPU/rede da infraestrutura atual continuam variáveis; custo real só será conhecido no teste autorizado.

Antes de um futuro deploy, considerar o conjunto coerente: geradores, contrato da `radarApi` e PWA. Implantar apenas o gerador e enviar sete notícias a uma API ainda limitada a cinco seria incompatível. Nesta tarefa nenhuma implantação foi feita.
