# Saudação pública da Alexa

A abertura usa o fuso do dispositivo consultado pelo SDK oficial (`getUpsServiceClient().getSystemTimeZone(deviceId)`). O SDK utiliza o token do request em memória; nenhum identificador ou token é registrado ou persistido. Falha, resposta inválida ou demora superior a 1,5 segundo usa America/Sao_Paulo. Manhã: 05–11h; tarde: 12–17h; noite: 18–04h.

Quando Alexa fornece `context.System.person.personId` válido, a resposta inclui `alexa:name` somente na abertura. A própria Alexa resolve o nome. Não há Person Profile API, armazenamento do nome, tracking ou envio ao Firebase/OpenAI. Sem personId, a mesma edição é narrada com saudação genérica. Conteúdo editorial continua escapado como texto; somente a tag de nome construída internamente entra como SSML.

Skills Personalization deve estar habilitado na skill; o usuário também precisa de Voice ID e personalização habilitados no aplicativo Alexa. Não são solicitados Customer Name, email, telefone ou endereço.

O handler remoto Development não possui o Custom Task presente no arquivo local. Sua atualização preserva esse estado: somente import da saudação, consulta de timezone, despedida genérica e DefaultApiClient são alterados. Não introduzir Custom Task neste deploy.

Referências oficiais:
- https://developer.amazon.com/en-US/docs/alexa/custom-skills/add-personalized-greetings-or-prompts.html
- https://developer.amazon.com/en-US/docs/alexa/custom-skills/add-personalization-to-your-skill.html
- https://developer.amazon.com/en-US/blogs/alexa/alexa-skills-kit/2019/07/getting-started-with-cake-time-using-the-alexa-settings-api-to-look-up-the-device-time-zone

Teste físico pendente: abrir Radar ACS no Echo Show e confirmar saudação, nome quando reconhecido, edição e capa. Testes locais e sucesso de deploy não comprovam reconhecimento de voz ou pronúncia no dispositivo.
