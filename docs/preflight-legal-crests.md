# Preflight local — páginas jurídicas e escudos

## Diagnóstico de /privacy

O registro do preflight abortado mostra o fallback `Carregando página...` no lugar do conteúdo de Legal. A assertion findByRole expirou enquanto a rota ainda estava suspensa. Não há import rejeitado ou exceção de runtime registrada. Legal.jsx conserva o título `Política de Privacidade — Radar ACS`; /terms conserva `Termos de Uso — Radar ACS`.

A falha foi de sincronização do teste com o carregamento lazy/Suspense, não alteração do título. O prazo dependia da resolução/transformação do módulo e do retry do React, sujeitos à carga das suítes executadas simultaneamente naquele preflight. A parcela exata de tempo consumida por transformação ou agendamento não estava instrumentada no incidente.

Legal.test.jsx agora executa render e espera pelo mesmo import real dentro de async act, que conclui a retomada do Suspense antes da assertion existente. Sem aumento de timeout, mock de Legal, retirada/enfraquecimento de assertion ou alteração jurídica. Os testes de navegador verificam acesso direto, reload, navegação entre páginas, títulos exatos, ausência de chamadas API/Auth, ausência de erro JavaScript e overflow em 375/1440 px.

## Escudos

A implementação local anterior foi preservada; não foi refeita. Registro e componente compartilhados, fonte oficial do Botafogo-RJ, fallback para os 59 clubes ainda sem fonte verificada. Busca parcial/case/acento, diferenciação dos Botafogos, múltiplos selecionados e vínculo antigo preservados. Home limita composição compacta a quatro e +N; /live usa exclusivamente partidas entregues pela fonte. Detalhes e medidas em team-crests.md.

Nenhuma alteração de backend, produção, dados, Alexa, Scheduler, IAM, secrets ou regras nesta etapa. Nenhum deploy.

## Resultado final

Backend 277/277, frontend 193/193, navegador 54/54: zero falhas. Privacy e Terms confirmados em 375 e 1440 px; escudos confirmados em 390 e 1440 px. Pronto para repetir deploy controlado somente mediante autorização; nenhum deploy nesta etapa.
