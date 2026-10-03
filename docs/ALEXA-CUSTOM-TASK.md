# Custom Task Radar ACS — preparação local

**Nenhum deploy ou publicação foi feito.** Locale pt-BR; invocation name radar acs preservado. A abertura normal continua usando LaunchRequest. A tarefa reutiliza o mesmo cliente GET e TTS.

## Arquivos e valores

- `lambda/index.js`: trata LaunchRequest com task; nome completo `<SKILL_ID>.OuvirBriefingHoje`, versão `1`, input `{}`, locale `pt-BR`. Retorna voz e Tasks.CompleteTask (200, 400 ou 500). Sem AudioPlayer, vídeo ou APL.
- `lambda/playback.js`: abertura sem promessa de cinco assuntos, compatível com 3–5. O conteúdo permanece editorial.
- `skill.json`: `manifest.apis.custom.tasks` contém `{ "name": "OuvirBriefingHoje", "version": "1" }`. Endpoints existentes preservados.
- `tasks/OuvirBriefingHoje.1.json`: OpenAPI, tarefa sem parâmetros, título pt-BR **Ouvir briefing de hoje**, descrição **Reproduz o briefing mais recente disponível no Radar ACS.**, acesso `public` exigido pelo catálogo de tarefas da Amazon.
- `examples/alexa-custom-task-request.json`: envelope de teste; substituir o marcador de Skill ID em todos os lugares pelo ID real.

## Configuração manual antes de qualquer deploy

1. Alexa Developer Console → Radar ACS → **Build → CUSTOM → Tasks**, quando esse menu estiver disponível: conferir a tarefa. A documentação de integração menciona o console, mas a página de implementação diz que a criação exige ASK CLI. Não presumir um botão de importação inexistente.
2. Obter o ID da Skill existente. Não usar o ID da Lambda nem criar outra Skill. Exportar o pacote **development** atual pela ASK CLI/SMAPI; preservar seus endpoints e configuração Alexa-hosted.
3. Nesse pacote, inserir a definição em `tasks/` e adicionar somente `apis.custom.tasks` ao manifest. Registrar/importar o pacote para a **Skill existente em development**, conforme o fluxo oficial ASK CLI/SMAPI. Essa operação permanece manual e não foi executada. Não executar `ask deploy` na pasta atual sem antes configurar e conferir o vínculo com a Skill existente.
4. Console → **Code**: quando for autorizado testar na Amazon, copiar os arquivos `index.js` e `playback.js` preparados, salvar e fazer deploy somente para Development. Copiar apenas index.js não registra a definição da tarefa.
5. Console → **Test**: selecionar **Development** e Portuguese (BR). Conferir a abertura normal com “Alexa, abra radar acs”. A Custom Task não precisa de nova intent ou invocation name.
6. Console → **Certification → Validation**: validar o schema sem enviar para certificação/publicação. Não escolher distribuição/Live.

## Testar o handler em Development

Testes locais: `npm test` na raiz do projeto. Para teste remoto futuro do handler, depois do deploy manual autorizado do código, ajustar Skill ID e timestamp no envelope de exemplo e executar:

```powershell
ask smapi invoke-skill-end-point -s <SKILL_ID> --stage development --skill-request-body file:./examples/alexa-custom-task-request.json --endpoint-region default
```

Esperado: TTS do briefing e Tasks.CompleteTask com código 200; ausência/erro retorna 500. Esse comando testa o handler, não o fluxo completo de Rotinas. Não foi executado.

## Limitação para o aplicativo Alexa

A Amazon lista pt-BR, mas exige que a Skill tenha sido publicada em Live **pelo menos uma vez** antes do teste de Custom Task em Rotinas no Development. O histórico remoto desta Skill não foi inspecionado. Se ela nunca foi Live, não podemos cumprir o teste de Rotinas mantendo a proibição atual de publicar. Nenhum workaround foi criado.

Somente quando o requisito acima já estiver cumprido e a tarefa registrada: mesma conta Amazon → Mais → Skills e jogos → Suas Skills → Dev → Radar ACS → habilitar. Depois: Mais → Rotinas → + → nome “Radar ACS ao acordar” → gatilho de voz “ao acordar” → Adicionar ação → Skills → Suas Skills → Radar ACS (Development) → Ouvir briefing de hoje. Atualizar a lista se necessário, selecionar Echo e testar. Excluir a rotina de teste ao terminar; não habilitar Live nesta rodada.

**Hoje a tarefa está pronta localmente, mas não é possível afirmar que já aparece no app.**

Referências oficiais: [implementação e teste do handler](https://developer.amazon.com/en-US/docs/alexa/custom-skills/implement-custom-tasks-in-your-skill.html), [locales e schema para Rotinas](https://developer.amazon.com/en-US/docs/alexa/custom-skills/integrate-custom-task-with-alexa-routines.html), [requisitos de teste em Development](https://developer.amazon.com/en-US/docs/alexa/custom-skills/test-custom-task-with-alexa-routines.html).
