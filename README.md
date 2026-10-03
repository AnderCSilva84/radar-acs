# Radar ACS — MVP

A estrutura Alexa-hosted existente foi preservada em lambda/. A abertura busca conteúdo externo; não há briefing gravado no handler. Firestore armazena briefings/{YYYY-MM-DD}; Firebase Functions fornece HTTPS; a Skill fala roteiroAlexa por TTS/SSML. A consulta filtra publicado == true e ordena data decrescente. Atualizar uma edição antiga não a transforma na mais recente. Datas futuras publicadas também são elegíveis: mantenha a edição de amanhã como rascunho até desejar ouvi-la.

## Arquivos

Criados: api/{index,handler,validation,playback}.js, api/package.json, lambda/{briefing-client,playback}.js, lambda/config.json, firebase.json, firestore.rules, firestore.indexes.json, .gitignore, .env.example, examples/briefing-teste.json, scripts/publish-briefing.js, tests/mvp.test.js e este README. Arquivos package-lock.json são gerados ao instalar dependências.

Modificados: lambda/index.js, lambda/package.json, interactionModels/custom/pt-BR.json e skill.json. Os endpoints existentes da Amazon e a invocação radar acs foram preservados. util.js e local-debugger.js continuam no projeto.

## Instalar e testar

Node.js 20 ou superior localmente; Firebase Functions usa Node.js 22.

~~~powershell
npm install --prefix lambda
npm install --prefix api
npm test
~~~

Os testes usam repositório simulado para validação, API, autenticação, cache, SSML e respostas pelo SDK real da Alexa (com consulta remota simulada). Não comprovam deploy real, índices Firestore nem reprodução no dispositivo. Para executar a API com emuladores, configure Firebase CLI e Java, crie api/.secret.local com RADAR_ADMIN_TOKEN (não versionado) e rode npx firebase-tools emulators:start --only functions,firestore --project demo-radar-acs. Os emuladores usam dados locais, não a produção. A Skill exige HTTPS: teste sua integração pelo endpoint publicado.

## Configuração e deploy

1. No Firebase Console, crie ou selecione um projeto seu, habilite Firestore em modo produção e configure o plano Blaze para Functions. O deploy pode gerar cobrança. Escolha a região do banco próxima de us-east1.
2. Faça login na CLI com npx firebase-tools login e identifique o ID do projeto. Não foi criado um ID fictício em .firebaserc.
3. Gere um segredo aleatório com pelo menos 32 caracteres e guarde-o em um gerenciador de senhas. Cadastre pelo prompt seguro da CLI:

~~~powershell
npx firebase-tools functions:secrets:set RADAR_ADMIN_TOKEN --project SEU-PROJETO
npx firebase-tools deploy --only firestore,functions --project SEU-PROJETO
~~~

Aguarde o índice ficar pronto. As regras negam acesso direto de clientes; o Admin SDK usa a identidade da Function, sem arquivo de credencial no código. A Function é invocável publicamente para leitura; POST exige Bearer token. A resposta de leitura contém somente data, titulo, roteiroAlexa e audioUrl de uma edição publicada. Use um banco/projeto dedicado: estas regras bloqueiam todo acesso cliente ao banco.

4. Copie a URL de radarApi retornada no deploy. GET: URL-DA-FUNCTION/api/briefing/latest. POST: URL-DA-FUNCTION/api/briefing.
5. Na Skill, configure BRIEFING_API_URL se o ambiente permitir. Para Alexa-hosted, a alternativa direta é preencher briefingApiUrl em lambda/config.json com a URL pública completa de GET. Essa URL não é segredo. Não copie RADAR_ADMIN_TOKEN para a Skill.
6. No Alexa Developer Console da Skill existente, atualize os arquivos de lambda/ no editor Code e use Save e Deploy. Preserve package.json e instale dependências pelo fluxo hospedado. Em Build, importe interactionModels/custom/pt-BR.json, salve e faça Build Model. Não troque os ARNs existentes nem publique na Alexa Store.

Referências oficiais: [Functions HTTPS](https://firebase.google.com/docs/functions/http-events), [segredos](https://firebase.google.com/docs/functions/config-env), [limites de resposta Alexa](https://developer.amazon.com/en-US/docs/alexa/custom-skills/request-and-response-json-reference.html).

## Publicar o teste e o briefing de amanhã, 03/10/2026

.env.example documenta BRIEFING_API_URL (Skill), RADAR_API_BASE_URL (URL da Function sem /api/briefing) e RADAR_ADMIN_TOKEN (apenas publicação local e Secret Manager). Um arquivo .env não é carregado automaticamente. Use variáveis do ambiente ou Node --env-file=.env; não versione o arquivo.

~~~powershell
node --env-file=.env scripts/publish-briefing.js examples/briefing-teste.json
~~~

O teste tem o roteiro solicitado e cinco itens sintéticos, claramente identificados; não representa notícias reais e dura menos de cinco minutos. Ele só é inserido no Firestore quando o comando acima é executado com a API configurada.

Copie examples/briefing-teste.json para examples/briefing-2026-10-03.json. Altere data e id para 2026-10-03, titulo, resumo, roteiroAlexa, oportunidadeDoDia e as cinco notícias reais (ordem 1 a 5; titulo, resumo, contexto, fonte e URL HTTPS). Mantenha audioUrl null. Use publicado false para salvar um rascunho; envie novamente com publicado true para disponibilizar a edição:

~~~powershell
node --env-file=.env scripts/publish-briefing.js examples/briefing-2026-10-03.json
~~~

POST é um upsert por data; preserva criadoEm e atualiza atualizadoEm com timestamps do servidor. Enviar publicado false despublica aquela edição. Com outras edições publicadas, a Skill volta à mais recente delas. A API valida todas as edições, inclusive rascunhos; não aceita campos de timestamps enviados pelo cliente.

O roteiro deve ser texto simples, sem tags SSML. A Skill escapa caracteres XML e adiciona pausas entre parágrafos. Escreva siglas e números como devem soar. A abertura é acrescentada automaticamente; evite repeti-la no roteiro real. O limite de 8.000 caracteres inclui abertura, pausas, escape XML e aviso de cache; textos maiores são recusados sem truncamento. A duração de 5 a 8 minutos é uma meta editorial, não uma garantia do TTS. Cronometre no Echo e ajuste o roteiro.

## Testar na Alexa

Verifique GET no navegador: success true e a edição desejada. No Developer Console, habilite Test em Development para pt-BR, digite “abra radar acs” e confira saída SSML e logs. No Echo com a mesma conta Amazon, diga “Alexa, abra Radar ACS”. A edição deve começar automaticamente. Atualize o roteiro pela API e abra novamente: o conteúdo deve mudar sem novo deploy da Skill.

Teste sem edições publicadas: “Seu briefing de hoje ainda não foi publicado. Tente novamente mais tarde.” Em falha de rede sem cache: “Não consegui acessar o Radar ACS neste momento. Tente novamente em alguns minutos.” O cache existe apenas na instância Lambda aquecida, sem persistência ou garantia após reinício; em falha temporária usa a última edição válida com aviso. Uma resposta explícita de ausência limpa o cache. O GET é consultado em cada abertura; o timeout da Skill é 3,5 segundos. Cold starts da API podem excedê-lo; se isso ocorrer com frequência, considere minInstances: 1 após avaliar custos.

## Fase 2 e pendências externas

Deploy e teste físico exigem seu projeto Firebase, login, faturamento e acesso ao console da Skill. Sem esses recursos, não é possível afirmar que o Echo já reproduz conteúdo remoto. Painel, automação de notícias, ElevenLabs, cache persistente e comandos por tema ficam para depois. audioUrl é armazenado e retornado, mas getBriefingPlayback usa TTS nesta fase; reprodução MP3 futura deve implementar AudioPlayer e os respectivos eventos/interfaces antes de ativá-la.

## Roteiro editorial e serviço de publicação

A abertura pertence exclusivamente à Skill. roteiroAlexa começa diretamente pelo conteúdo editorial; a validação rejeita saudações e frases da abertura. O exemplo foi corrigido sem mudar playback.js, cache ou SSML. Para atualizar uma edição já publicada, execute novamente o script com o JSON corrigido. Não é necessário novo deploy da Alexa para mudar somente o briefing.

O script agora utiliza publishBriefing() em services/publish-briefing.js. Geradores futuros podem chamar essa função com briefing estruturado e configuração de ambiente; ela valida antes de enviar o POST autenticado existente. A validação do servidor foi atualizada em api/validation.js e só será aplicada à produção após um deploy Firebase separado. Nenhum deploy foi executado automaticamente. A proposta e as pendências de geração diária estão em [docs/AUTOMACAO.md](docs/AUTOMACAO.md).

A edição de teste 2026-10-02 foi republicada com roteiro editorial e confirmada pelo GET (HTTP 200). A correção de conteúdo já está disponível para a Skill existente, sem deploy Amazon. A nova validação de abertura no servidor permanece local até um deploy Firebase autorizado.

## Primeira fase do gerador manual

Implementada a Function generateRadarManual com Responses API e web_search, sem agendamento. Configuração em api/generator-config.json. OPENAI_API_KEY é vinculada exclusivamente pelo Secret Manager da Function. Consulte [docs/GERACAO-MANUAL.md](docs/GERACAO-MANUAL.md) para uso, custos, segurança e limites. A proposta antiga de coleta e geração em AUTOMACAO.md foi substituída nesta fase pela escolha OpenAI, web_search e timezone America/Belem; Scheduler permanece futuro.

## Diagnóstico seguro do gerador

Etapas identificadas, exceções redigidas e snapshot temporário anterior à validação estão preparados localmente. Não foram implantados nesta revisão. Consulte [docs/DIAGNOSTICO-GERADOR.md](docs/DIAGNOSTICO-GERADOR.md) para evidências da falha, limites da recuperação, custo e limpeza manual de diagnósticos.

## Rodada local: contrato 3–5 e Custom Task

O contrato local agora aceita de três a cinco notícias. A recuperação usa somente blocos de roteiro ligados explicitamente a cada notícia, sem nova IA. Consulte [pipeline e limites](docs/PIPELINE-3-A-5.md) e [preparação Alexa Custom Task](docs/ALEXA-CUSTOM-TASK.md). Esta rodada não fez deploy Firebase/Amazon nem geração ou publicação; a terceira edição continua GENERATED_NOT_PUBLISHED. A disponibilidade de Rotinas em Development depende dos requisitos documentados pela Amazon, incluindo histórico de publicação em Live.
