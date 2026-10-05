# Perfil editorial e calendário

Implementação administrativa com testes por mocks. Deploy não executa geração, Scheduler ou publicação de edição.

## Administração

O Firebase Authentication autentica Email/Password. O SDK usa persistência de sessão para permitir refresh na mesma aba; a senha nunca é gravada pelo aplicativo. A configuração pública do app vem de `/__/firebase/init.json` do Hosting, validando `projectId=radar-acs`. O proxy Vite encaminha esse caminho e `/api/admin/**` ao projeto existente.

`GET /api/admin/editorial` e `PUT /api/admin/editorial` exigem um Firebase ID token validado pelo Admin SDK, incluindo revogação, e igualdade exata com `ADMIN_UID`. Este parâmetro pertence ao backend, sem valor default autorizado. UID ausente bloqueia todos. E-mail e mera presença de login não autorizam. `RADAR_ADMIN_TOKEN` continua exclusivamente na API de publicação existente.

`/admin`, `/admin/preferences` e `/admin/calendar` aguardam a sessão e a autorização do backend. `/preferences` redireciona para `/admin/preferences`. Visitantes vão para `/login`; outras contas recebem acesso negado. Home e histórico não inicializam Auth. Não há cadastro público. Firestore Rules permanecem negando acesso direto de clientes; o Admin SDK efetua os acessos autorizados do backend.

## Documento único

`settings/editorial`: `editorial`, `appearance`, `followedTeams`, `events`.

Uma leitura no início da geração, incluindo calendário; nenhuma leitura por evento. Filtragem dos eventos do dia em memória, pela data editorial America/Belem já usada pelo motor. Limites: 100 eventos, 20 times, payload máximo 64 KiB. Calendário pessoal finito, adequado ao único Superadmin; crescimento além desses limites exigirá revisão futura, sem ler histórico de edições.

Salvar preferências ou criar/editar/excluir evento faz um PUT e uma escrita do documento completo, sem autosave. Alterações concorrentes em várias abas seguem último salvamento; não há sincronização em tempo real. Preferências antigas do localStorage não são importadas automaticamente para a configuração oficial.

Defaults: Tecnologia/IA, Desenvolvimento, Concursos/carreira e Oportunidades high; Brasil/Mundo, Economia, Futebol e Clima medium. Botafogo ativo (`sport=football`, `country=BR`) em uma lista extensível. Futebol off não envia times seguidos no prompt. Calendário inicialmente vazio: os exemplos não são cadastrados nem presumem fatos de partidas. Tipos: special, sports, local, national e editorial.

## Geração

O documento entra como contexto compacto na chamada Responses existente; nenhuma chamada adicional, retry ou alteração de Scheduler. High prioriza, medium depende de relevância, low apenas fatos importantes e off impede pesquisa deliberada. Eventos elevam temporariamente a prioridade sem eliminar interesses nem criar cotas artificiais.

Eventos ativos na data são ordenados por headline > high > normal, depois `priorityOrder` crescente e ID lexicográfico. O primeiro headline determina `editionType=special`, `context=id`, `specialTitle=title` e capa do evento ou capa padrão. Sem headline, `editionType=regular` e capa padrão. Metadados são definidos pelo código, nunca pela IA. IDs são limitados a 80 caracteres alfanuméricos, hífen e sublinhado. Um coverId sem asset existente mantém os fallbacks atuais do consumidor. `cirio-2026` é suportado como ID, mas esta tarefa não cria sua arte.

Ausência do documento usa defaults e calendário vazio. Falha de leitura gera somente warning estático e usa defaults. Perfil inválido usa perfil default; calendário inválido preserva perfil válido e gera edição normal. Warnings nunca incluem mensagem de exceção ou credenciais. Não é gate de publicação. A validação normal de notícia/publicação continua intacta. As reservas, guardas de geração, cron, timezone e IAM não são alterados.

## Pré-requisitos antes de deploy

1. No Firebase Console **radar-acs**, Authentication > Sign-in method: habilitar Email/Password.
2. Authentication > Users: criar ou confirmar `acs@acs.com` com senha definida pelo proprietário somente no Console.
3. Configurar o parâmetro backend `ADMIN_UID` com o UID exato dessa conta; não substituir pelo e-mail. Não colocar senha nessa configuração.
4. Confirmar o app Web do projeto e `/__/firebase/init.json`. Nenhuma configuração, conta ou credencial é criada automaticamente.
5. Após autorização de deploy, publicar somente os componentes necessários. Não executar geração como parte do deploy.
