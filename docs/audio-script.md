# Notícias e apresentação de áudio

A elegibilidade de uma notícia depende de título/resumo utilizáveis, fonte,
URL observada válida, data recente e ausência de duplicação. O roteiro
personalizado individual não determina a existência da notícia.

Depois da seleção, audio-rendering.js constrói a fala deterministicamente:
1. texto personalizado utilizável, sanitizado;
2. fallback título + resumo sanitizados;
3. apenas resumo sanitizado;
4. omissão somente do bloco de áudio se nada puder ser falado ou couber.
A notícia permanece na edição/PWA. Se nenhum bloco puder ser usado, a fala
informa apenas que as notícias estão disponíveis no Radar ACS.
Saudação e encerramento continuam na Skill; não são repetidos pelo gerador.

Sanitização remove HTML/SSML, markdown, URLs, controles e referências técnicas;
entidades XML são decodificadas. A fala permanece texto simples. playback.js
escapa &, <, > e aspas exatamente uma vez ao gerar SSML. O renderer reserva
capacidade usando no máximo 6.500 caracteres após escape XML. Texto excessivo
é substituído por fallback ou omitido da fala; notícias não são descartadas.
Não há contagem mínima de palavras nem exigência de bloco customizado.
O validador final protege somente apresentação vazia/não sanitizada e o limite
SSML existente de 8.000 caracteres. Nenhuma nova chamada de IA é feita.

## Incidente de 04/10

O diagnóstico disponível registra candidate-1 INVALID_URL e candidates 2–5
AUDIO_SCRIPT_INVALID, sem mensagem específica nem conteúdo editorial.
Não é possível atribuir uma condição exata a cada um dos quatro candidatos.
O acoplamento é comprovado pelo código anterior: validateGenerated era chamado
individualmente antes de aceitar notícias e incluía validateAudioScript.
As antigas condições eram:
- global abaixo de min(120, 40 × quantidade) ou acima de 750 palavras;
- URL, markdown de link, tracking, tags ou citações técnicas no global;
- se algum bloco existisse, qualquer bloco não-string ou abaixo de 25 palavras;
- bloco terminando em reticências ou e/ou/porque/para/com/de;
- global diferente da concatenação exata dos blocos com duas quebras de linha.
Na análise individual o mínimo global era 40 palavras. Os logs não permitem
concluir se foi esse mínimo, truncamento, marcação ou outra condição listada.

A regressão reproduz o cenário conceitual, não os textos reais perdidos:
cinco candidatos, uma URL inválida, quatro falas ausentes/malformadas/truncadas.
Quatro notícias são publicadas apenas em memória e recebem áudio de fallback.
Nesta tarefa não há geração, recuperação nem publicação real.
