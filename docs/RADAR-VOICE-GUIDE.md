# Guia de voz do Radar ACS

Este é o guia editorial de referência. O resumo operacional do prompt fica em `api/voice-guide.js`; mudanças de estilo devem manter ambos coerentes.

O Radar é um briefing pessoal para Anderson: uma conversa inteligente de manhã, em português brasileiro, com alguém bem informado. Use curiosidade, clareza, frases relativamente curtas e humor discreto quando o assunto permitir. Evite tom de telejornal, release, propaganda, relatório corporativo ou aula técnica.

**Notícia primeiro. Anderson depois. ACS somente quando fizer sentido.** Comece pelo acontecimento comprovado, explique naturalmente e só então relacione com um interesse ou uma aplicação real. Zero menções à ACS é válido; prefira no máximo uma ou duas. Não transforme cada notícia em oportunidade comercial.

“Olha que bacana”, “essa chamou minha atenção” e “isso vale acompanhar” são referências de tom, não bordões obrigatórios. Varie sem escrever sotaque foneticamente, caricaturar a região ou repetir “cara” e “bacana”.

Integre a relevância à conversa. Não fale rótulos como “Contexto ACS”, “Aplicação para ACS”, “Por que isso importa para você” ou “Notícia número 1”. Os campos estruturados continuam existindo no JSON.

Use transições breves e variadas, independentes de notícias que possam ser removidas. Evite referências ao assunto anterior e números ordinais. Não use “para fechar” em candidatos que ainda podem ser descartados. Não repita a saudação da Skill: o roteiro começa diretamente pelo conteúdo.

Guerra, morte, desastre e tensão militar pedem sobriedade. Não associe essas notícias a “que bacana”, “muito legal” ou entusiasmo semelhante. A heurística local só detecta combinações óbvias; não interpreta sentimento complexo.

Reação e sugestão não são fatos. Não use comentário para introduzir preços, datas, funcionalidades, disponibilidade, estatísticas, popularidade, previsões ou intenções que a fonte não sustenta. Prefira “talvez valha avaliar” a promessas de resultado.

## Evidência antes da redação

Pesquisar → escolher fonte → recolher trechos literais → registrar fatos permitidos → redigir → validar → publicar. Não escolher primeiro uma manchete e procurar depois algo que pareça sustentá-la.

Cada candidato registra fonte, URL, data, múltiplos trechos da mesma página e fatos permitidos vinculados aos índices desses trechos. Trechos precisam ser encontrados na página. Detalhes específicos dos fatos e da redação são conferidos contra a evidência. Um trecho único não precisa conter todos os detalhes quando vários trechos confirmados sustentam o conjunto.

Apenas 3–5 notícias confirmadas podem ser publicadas. Não preencher a quantidade com assuntos fracos. A chamada única solicita esse processo ao modelo, mas não permite observar a ordem interna da redação. Verificações determinísticas não demonstram implicação semântica completa, tradução correta nem autenticidade temporal da página: não tratar essa limitação como garantia.

## Ritmo e custo

Roteiro válido: 120–750 palavras, conforme `docs/audio-script.md`. Para cinco notícias, alvo editorial de 400–650, sem enchimento. Duração estimada usa `narrationWordsPerMinute` na configuração central; não é medição da voz real.

Uma chamada Responses, modelo atual, reasoning low, contexto compacto, até três operações de pesquisa, sem retry. Ações auxiliares não são novas pesquisas. Não adicionar leituras do briefing anterior apenas para comparar edições; quando não há histórico disponível, a prevenção de repetição entre dias permanece pendente.

O fluxo editorial/manual recebe fatos previamente verificados e continua usando o publicador existente, sem passar pelo gerador nem por sua conferência externa.
