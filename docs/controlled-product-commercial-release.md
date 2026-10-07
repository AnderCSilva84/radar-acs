# Controlled Product + Commercial Release

Projeto radar-acs, número 596095541153, branch main. Preflight aprovado: backend 277, frontend 193, navegador 54, build PASS. Working tree revisado, sem mudanças novas no produto durante o deploy.

Publicação autorizada realizada em 05/10/2026 (America/Fortaleza): radarApi, generateRadarManual e generateRadarScheduled. CLI: três Functions implantadas, zero erros; status ACTIVE. Hosting publicado em https://radar-acs.web.app. Nenhum deploy de regras, índices ou outras Functions.

Após Functions deploy, Scheduler ENABLED, cron 0 8 * * *, America/Belem. Target, OIDC/audience e radar-scheduler@radar-acs.iam.gserviceaccount.com preservados. roles/run.invoker permanece nesse principal no serviço generateradarscheduled. Não executado manualmente.

Storage e Firestore: regras publicadas correspondem exatamente às locais auditadas. Upload somente UID superadmin autorizado, até 5 MiB, JPG/PNG/WebP; público sem create/list, get individual permitido no prefixo advertising. Firestore direto nega read/write a clientes. Verificação somente leitura, sem upload de teste.

Smoke em produção por navegador isolado, sem mocks de API: /, /history, /listen, /live, /privacy e /terms HTTP 200 em 1440/390 px. Sem overflow ou erro JavaScript. Nenhum chunk privado nas rotas públicas. Escudo oficial do Botafogo carregado. Jovem Pan e ACS Music presentes. Imagens editoriais sem aprovação permanecem fallback. Nenhum dado novo foi criado.

Latest corresponde integralmente ao snapshot anterior: Radar ACS — Edição #004, 2026-10-05. A campanha anterior mantém todos os campos e a quantidade. HOME_TOP com uma campanha continua estático; zero/múltiplas campanhas foram validados localmente, sem campanha artificial em produção.

Cinco rotas administrativas rejeitam visitante anônimo e levam ao login; GET /api/admin/advertisers sem autenticação retorna 401. Revisão autenticada da nova Central Comercial e da busca administrativa em produção PENDENTE: Chrome do usuário possui sessão e formulário anterior não salvo; preservado. A ferramenta de automação sofreu repetidos timeouts ao acessar a outra aba. Não foram lidas, copiadas ou gravadas credenciais para contornar o bloqueio. Testes locais administrativos PASS não substituem essa verificação remota pendente.

Artefatos: frontend/review/controlled-release/smoke.json e capturas desktop/mobile das seis rotas. O script de smoke fica fora de dist; não modifica aplicação. Zero novas chamadas OpenAI, edições, uploads ou escritas de dados. Alexa, configuração Scheduler, IAM, secrets e demais projetos não foram alterados.

Deploy PASS; smoke público PASS; aceitação operacional completa PENDENTE pela automação administrativa bloqueada. Nenhum retry ou correção automática em produção.
