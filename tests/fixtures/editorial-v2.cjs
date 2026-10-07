'use strict';
// Invented local test cases, never editorial input for a production edition.
const stories = [
    ['desenvolvimento', 'Biblioteca amplia testes locais de aplicações', 'A biblioteca amplia os testes locais de aplicações e permite comparar relatórios entre execuções.', 'Os exemplos documentados incluem verificação de consultas e análise de falhas em servidores de desenvolvimento.', 'A documentação descreve a execução dos testes antes da entrega de alterações e explica como interpretar os relatórios.'],
    ['tecnologiaIA', 'Laboratório publica documentação de inteligência artificial', 'O laboratório publica documentação de inteligência artificial com exemplos de classificação de documentos.', 'O material descreve os dados utilizados e apresenta limitações dos exemplos para avaliação técnica das equipes.', 'A documentação inclui orientações para conferir respostas e manter a revisão humana dos documentos classificados.'],
    ['concursosCarreira', 'Instituto abre inscrições para formação em redes', 'O instituto abre inscrições para formação em redes e administração de servidores em modalidade gratuita.', 'O edital informa os requisitos de participação e organiza o calendário das aulas práticas de infraestrutura.', 'As atividades incluem configuração de redes e diagnóstico de problemas com exercícios descritos no material oficial.'],
    ['oportunidades', 'Universidade oferece consultoria para pequenos negócios', 'A universidade oferece consultoria para pequenos negócios interessados em organizar vendas e atendimento.', 'O programa recebe inscrições pelo portal institucional e informa as etapas de seleção dos empreendimentos participantes.', 'A equipe oferece orientação sobre processos de atendimento e acompanha a aplicação das mudanças no negócio.'],
    ['clima', 'Instituto emite aviso de chuva para região', 'O instituto emite aviso de chuva para a região com orientações de atenção às áreas vulneráveis.', 'O comunicado recomenda acompanhar os boletins atualizados e informa os canais oficiais de atendimento à população.', 'As recomendações incluem evitar áreas alagadas e observar as orientações das equipes locais de proteção civil.'],
    ['futebol', 'Botafogo divulga preparação para próxima partida', 'O Botafogo divulga a preparação para a próxima partida com atividades realizadas no centro de treinamento.', 'A comissão técnica organizou exercícios de posicionamento e apresentou informações sobre a rotina de recuperação dos atletas.', 'O comunicado do clube descreve a continuidade dos treinos e orienta a torcida a acompanhar os canais oficiais.', 'botafogo'],
    ['futebol', 'Clube do Remo anuncia melhorias no estádio', 'O Clube do Remo anuncia melhorias no estádio para organizar o acesso da torcida às arquibancadas.', 'O comunicado apresenta as áreas de circulação e descreve a manutenção realizada nos pontos de entrada do público.', 'O clube informa que as orientações de acesso serão divulgadas nos canais oficiais antes dos próximos jogos.', 'remo'],
    ['brasilMundo', 'Porto apresenta plano de modernização operacional', 'O porto apresenta um plano de modernização operacional para melhorar a circulação de cargas nos terminais.', 'O documento prevê organização dos acessos e revisão de processos de atendimento às empresas de transporte.', 'A administração informa que o cronograma será acompanhado por relatórios públicos sobre o andamento das atividades.'],
    ['economia', 'Banco publica relatório sobre crédito empresarial', 'O banco publica um relatório sobre crédito empresarial com análise das condições de financiamento dos negócios.', 'O levantamento compara modalidades de empréstimo e descreve os cuidados necessários na avaliação dos contratos disponíveis.', 'O material recomenda conferir as condições de pagamento e analisar a capacidade financeira antes da contratação.'],
    ['desenvolvimento', 'Comunidade atualiza ferramentas de análise de código', 'A comunidade atualiza ferramentas de análise de código para identificar problemas em alterações de projetos.', 'A versão documentada inclui relatórios de verificação e exemplos de configuração para equipes que mantêm aplicações.', 'Os responsáveis publicaram orientações de instalação e detalharam as limitações dos verificadores utilizados nos exemplos.'],
    ['tecnologiaIA', 'Centro disponibiliza conjunto de dados de pesquisa', 'O centro disponibiliza um conjunto de dados de pesquisa para avaliar sistemas de reconhecimento de documentos.', 'O registro descreve os critérios de organização das amostras e informa as condições de utilização acadêmica do material.', 'Os pesquisadores destacam as limitações da coleção e recomendam documentar os resultados obtidos em cada avaliação.'],
    ['concursosCarreira', 'Escola publica vagas de formação profissional', 'A escola publica vagas de formação profissional voltadas à manutenção de computadores e suporte técnico.', 'A seleção considera os requisitos descritos no edital e apresenta um calendário de inscrição e matrícula dos estudantes.', 'As aulas abordam diagnóstico de equipamentos e atendimento aos usuários com atividades práticas supervisionadas pelos professores.']
];
function pool(date = '2026-10-06') {
    return stories.map(([category, title, first, second, third, teamId], i) => ({ title, category, teamId: teamId || null,
        url: 'https://fixtures.example.org/materias/' + (i + 1), sourceName: teamId ? 'GE (fixture)' : 'Fonte institucional (fixture)', quality: 3,
        evidenceText: [first, second, third].join(' '), publishedAt: date, collectedAt: date }));
}
function writing(selected) {
    return { noticias: selected.map(candidate => {
        const e = candidate.evidence;
        const editorialSummary = e[0].text + '\n\n' + e.slice(1).map(unit => unit.text).join(' ');
        const speechSummary = e.slice(0, 2).map(unit => unit.text).join(' ');
        return { candidateId: candidate.id, editorialSummary, speechSummary,
            evidenceReferences: [
                { field: 'editorialSummary', segment: e[0].text, evidenceIds: [e[0].id] },
                { field: 'editorialSummary', segment: e.slice(1).map(unit => unit.text).join(' '), evidenceIds: e.slice(1).map(unit => unit.id) },
                ...e.slice(0, 2).map(unit => ({ field: 'speechSummary', segment: unit.text, evidenceIds: [unit.id] }))
            ] };
    }) };
}
function response(body) { return { status: 'completed', model: 'gpt-5.4-mini', usage: { input_tokens: 3000, output_tokens: 2500, total_tokens: 5500 },
    output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(body) }] }] }; }
module.exports = { pool, writing, response };
