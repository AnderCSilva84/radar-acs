# Proposta de automação diária do Radar ACS

Status: proposta, sem agendador, coleta ou integração paga implementados. O MVP de leitura e a Skill permanecem intactos. publishBriefing() já está implementada em services/publish-briefing.js e é utilizada pelo script de publicação; recebe JSON, valida e envia POST autenticado para a API existente. Uso requer Node.js 20+ no gerador; não enviar esse serviço para a Alexa.

## 1. Arquitetura

Cloud Scheduler → uma Firebase Function agendada → coleta de fontes atuais → seleção e geração de JSON → validação local → publishBriefing() → POST existente → validação no servidor → transação Firestore → GET existente → Skill.

Implantar futuramente a Function do gerador com seu serviço dentro da pasta api ou com empacotamento explícito de dependências. Não criar dependência file:..: o Firebase envia apenas api/. O serviço está hoje na raiz para uso local; o empacotamento do gerador ainda não está implementado.

## 2. Agendamento

Usar onSchedule de firebase-functions/v2/scheduler, cron 0 8 * * *, timeZone America/Fortaleza e região us-east1. Data editorial calculada nesse fuso, não em UTC. A execução começa aproximadamente às 08:00; coleta e geração levam tempo. Se a edição precisar estar disponível às 08:00, antecipar o início após medir a duração. Scheduler pode repetir ou sobrepor execuções: usar trava transacional com expiração e chave por data, antes de chamar APIs pagas. Não registrar o segredo no job.

Referência: [Firebase scheduled functions](https://firebase.google.com/docs/functions/schedule-functions).

## 3. Geração

Backend chama uma API de modelo, não a interface do ChatGPT. Uma opção tecnicamente compatível é Gemini Developer API, com saída estruturada via JSON Schema. Provedor/modelo final, faturamento, termos de uso e orçamento precisam ser aprovados antes da implementação. Não há API key, SDK de IA ou chamada de geração adicionados nesta etapa.

Enviar apenas artigos selecionados e evidências com título, data, URL e trechos permitidos. Exigir exatamente cinco notícias; cada uma deve explicar o acontecimento, importância, mudanças, oportunidade prática e possível aplicação à ACS Tecnologia. Distribuir essas respostas entre resumo e contexto, sem alterar o contrato existente. Gerar resumo escrito, roteiro editorial sem saudação e oportunidadeDoDia. Preferir os temas pedidos: tecnologia, IA, software, ferramentas para desenvolvedores, carreira e concursos em TI, acontecimentos relevantes, negócio, monetização e aplicações ACS. Não prometer ganhos nem inventar editais, números ou fontes.

A saída estruturada garante formato, não veracidade. Revisar automaticamente cada URL contra as evidências coletadas e fazer ensaios com revisão humana antes da ativação. Roteiro de 5–8 minutos sujeito ao limite real de 8.000 caracteres SSML; não truncar para caber. A duração deve ser calibrada no Echo.

Referência: [Gemini structured outputs](https://ai.google.dev/gemini-api/docs/structured-output).

## 4. Notícias atuais

Primeira opção de coleta: lista pequena de feeds RSS/Atom autorizados de veículos e fontes oficiais (anúncios de fornecedores, órgãos de concursos e notícias gerais). RSS fornece data, título, URL e geralmente resumo; não pressupor disponibilidade de texto completo. Confirmar os endereços e termos de cada fonte antes de cadastrá-los. Implementar parser de feed, timeout, limite de tamanho e lista permitida de hosts; não buscar URLs arbitrárias produzidas pelo modelo. Artigos são dados não confiáveis, nunca instruções para o gerador.

Janela inicial: últimas 24–48 horas, com checagem de data do evento versus data de publicação. Para concursos, conferir edital/fonte oficial. Caso RSS não cubra os temas, selecionar e autorizar uma API de notícias ou busca com cobertura brasileira. Grounding com Google Search é outra possibilidade paga, não ativada: confirmar compatibilidade do modelo com busca e saída estruturada; uma estratégia simples separa busca e geração em chamadas distintas. O modelo sozinho não é fonte de notícias atuais.

Referência: [Grounding com Google Search](https://ai.google.dev/gemini-api/docs/google-search).

## 5. Validação

Reutilizar validateBriefing(): data de calendário válida, título e roteiro obrigatórios, exatamente cinco notícias numeradas de 1 a 5, fonte e URL HTTPS, campos obrigatórios completos, publicado booleano, limite SSML com margem para aviso de cache, roteiro sem saudação ou abertura da Skill. A validação não comprova veracidade ou duração.

O gerador deve ainda conferir que todas as notícias vieram das fontes coletadas, que a data é a edição local desejada, que não existe repetição editorial e que publicado é true apenas após todas as verificações. Essas verificações editoriais futuras ainda não estão implementadas. Payload incompleto deve falhar antes do POST; servidor valida novamente antes de gravar.

## 6. Publicação

publishBriefing(briefing, {baseUrl, token}) usa a API HTTPS existente e retorna apenas success, id e publicado. Configuração alternativa: RADAR_API_BASE_URL e RADAR_ADMIN_TOKEN no ambiente. Credenciais são enviadas somente no cabeçalho Authorization, nunca no JSON, na Alexa ou em logs. Em execução agendada, vincular RADAR_ADMIN_TOKEN do Secret Manager à Function. POST atual faz upsert por data e mantém timestamps do servidor. GET continua o mesmo.

A chave por data impede múltiplos documentos para a mesma edição, mas não impede múltiplas chamadas de IA nem substituições. Antes de ativar, o gerador deve verificar edição já concluída e implementar trava/idempotência. A publicação manual atual continua permitindo corrigir edições.

## 7. Falhas

Se não houver cinco notícias válidas, não publicar nem apagar a edição anterior. Falhas de coleta/provedor: tentativas limitadas com espera crescente e prazo total; não repetir indefinidamente. HTTP 400: interromper e diagnosticar validação. HTTP 401: interromper e verificar segredo, sem imprimi-lo. HTTP 503 ou timeout: conferir a edição publicada antes de repetir; a gravação pode ter ocorrido apesar da perda da resposta.

Não despublicar um briefing válido antes de preparar seu substituto. Registrar somente etapa, data editorial, códigos de erro e contagem de itens; não registrar cabeçalhos de autenticação ou prompts com segredos. Usar Cloud Logging para diagnóstico e configurar alerta de falha antes da ativação. Não enviar mensagens externas automaticamente nesta proposta.

## 8. Duplicação

Consultar histórico recente, inicialmente sete dias. Canonicalizar URLs (remover parâmetros de rastreamento) e comparar URL, título normalizado e evento/entidades. Armazenar identidade de eventos separadamente, sem mudar o retorno público do briefing. Só repetir tema se houver novidade verificável, explicitando o desenvolvimento. Trava diária com expiração impede concorrência; execução concluída para a data local deve retornar sem regenerar. Não usar vetores ou infraestrutura adicional no início.

## 9. Custos prováveis

Volume inicial: cerca de 30 execuções mensais, 30 gerações e 30 publicações, mais leituras de histórico, coleta e tentativas. Um job Cloud Scheduler custa US$ 0,10/mês fora da franquia de três jobs gratuitos por conta; confirme o uso total da conta. [Preço oficial](https://cloud.google.com/scheduler/pricing).

Functions, Firestore, Secret Manager, tráfego e armazenamento de builds são cobrados conforme consumo e franquias; não assumir custo zero. Manter minInstances zero inicialmente e a política de retenção de builds já configurada. Leituras de histórico: aproximadamente 7 × 30 documentos/mês, além de trava, API e consultas Alexa; estimativa de volume, não promessa de faturamento. [Firestore](https://firebase.google.com/docs/firestore/pricing).

IA e eventual busca provavelmente dominarão o custo variável. Exemplo de dimensionamento, não tarifa: 30 × (12.000 tokens de entrada + 3.000 de saída) = 360.000 tokens de entrada e 90.000 de saída/mês antes de retries. Custo = 0,36 × preço por milhão de entrada + 0,09 × preço por milhão de saída + busca/notícias + infraestrutura. Tokens de raciocínio podem alterar a conta. Orçamento monetário só pode ser fechado após modelo e provedor definidos; conferir [preços Gemini](https://ai.google.dev/gemini-api/docs/pricing). Criar alertas de orçamento e limites de chamadas/tokens; alertas de orçamento não bloqueiam cobranças por si só.

## 10. Configuração e segredos

Existentes: RADAR_API_BASE_URL (URL pública base), RADAR_ADMIN_TOKEN (Secret Manager; preservar). Futuros: GEMINI_API_KEY se esse provedor for aprovado, NEWS_API_KEY somente se uma API paga for escolhida. Nunca copiar esses segredos para a Skill ou repositório.

Configuração não secreta proposta: GENERATION_MODEL (modelo escolhido), NEWS_FEED_URLS (lista validada), NEWS_LOOKBACK_HOURS, HISTORY_DAYS, GENERATION_MAX_OUTPUT_TOKENS, DAILY_GENERATION_LIMIT. Cron, timeZone e região podem ficar declarados no código da Function; nenhuma dessas configurações futuras está ativa agora. Usar identidade Google gerenciada para Firestore, Scheduler e IAM, sem JSON de service account no repositório.

## Para ativar

Aprovar provedor/modelo e orçamento; confirmar fontes e termos; configurar chave no Secret Manager; implementar coleta, seleção, geração estruturada e revisão de evidências; empacotar gerador e serviço dentro do deploy Firebase; implementar trava diária, histórico e retries; configurar permissões mínimas, cron/fuso, alertas e limites; ensaiar manualmente sem publicação automática, medir duração no Echo; executar teste integrado, fazer deploy Firebase autorizado e só então habilitar a execução diária. Nada disso exige nova Skill.
