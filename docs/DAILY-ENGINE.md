# Motor diário do Radar ACS

`generateRadarEdition(options)` em api/generator.js é o único motor editorial
usado pelos gatilhos manual e agendado. O nome antigo é somente um alias
compatível para scripts/testes, sem implementação paralela.

Uma chamada Responses com web_search, orçamento de três pesquisas, sem retry.
Seleção editorial próxima de cinco assuntos, publicação de um a cinco válidos.
Brasil/mundo, Pará/Belém, tecnologia, desenvolvimento, carreira, economia,
oportunidades e Botafogo participam por relevância, sem cotas artificiais.
Uma fonte confiável é suficiente; fontes permanecem associadas ao candidato.

Contrato, URL observada, conteúdo utilizável e duplicidade são controles por
candidato. Candidatos rejeitados saem com seu bloco, sem nova IA. O contrato
final e o roteiro completo são validados antes da publicação. Falhas auxiliares
da pesquisa e conteúdo independente indisponível são avisos explícitos;
contradições evidentes detectáveis continuam rejeitadas. A URL deve estar
associada a uma fonte efetivamente coletada em uma operação concluída.

A unidade de confiança é notícia coletada + fonte identificada + URL.
FACTUAL_EVIDENCE não participa do motor como gate de publicação: não há
busca adicional, leitura posterior da página ou confirmação independente.
Trechos incompletos geram aviso, sem rejeição apenas por ausência de prova
literal. Isso não constitui certificação factual. Zero notícias válidas
resulta em NO_VALID_NEWS; uma a cinco passam pelo contrato final antes de
publicar. A fixture de quatro notícias é conceitual e usa mocks, sem recuperar
nem republicar a resposta paga de 04/10.

Ambos os gatilhos usam a reserva diária existente e publicação create-only.
Uma tentativa já reservada não dispara outra chamada automaticamente.
O recovery guard existente permanece intacto; esta refatoração não reabre
a reserva de 04/10 nem autoriza outra tentativa real.

A edição especial usa o mesmo motor e metadados contextuais. A Alexa calcula
a abertura/encerramento e avisa quando a edição é antiga. Datas são pt-BR,
America/Belem. Sem fonte meteorológica integrada, temperatura é omitida.
O PWA inclui dia da semana usando a data editorial existente; não cria leitura
de banco nem timestamp inventado. APL não foi alterado.
