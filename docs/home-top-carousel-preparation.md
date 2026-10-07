Atualização: o carrossel funcional foi implementado localmente na [Rodada Produto + Central Comercial](product-commercial-round.md). O texto abaixo registra a preparação anterior.

# HOME_TOP: preparação local, sem carrossel ativo

`AdSlot position="HOME_TOP" campaigns={campanhasAtivas}` mantém a coleção.
`eligibleCampaigns` filtra posição, período inclusivo, ativação, URLs seguras
e criativos que falharam. Ordena prioridade numérica decrescente, preservando
a ordem de entrada em empates, sem mutar dados. Sem prioridade, mantém a ordem
atual. Não adicionamos campos ao backend nem ao Admin.

Zero elegíveis: nenhum espaço. Uma: AdCreative estático, como antes.
Duas ou mais: apresentação estática da primeira por enquanto, sem descartar
a coleção. O ponto opcional `renderCampaigns({ campaigns, position,
onImageError })` recebe todas as elegíveis para o futuro apresentador/carrossel.
Não implementamos o carrossel nesta tarefa. Falha de imagem remove somente
o ID correspondente da seleção e permite usar a próxima campanha.

AdCreative permanece reutilizável em apresentação e preview: URL, link,
criativo, alt, fit e identificação pertencem à campanha. Contain usa
scale-down, centralizado, sem ampliar imagens pequenas ou distorcer proporção.
O viewport mantém proporção reservada para evitar layout shift.

## Contrato do futuro apresentador

- PUBLICIDADE ficará fora da área rotativa, sempre visível.
- Viewport de altura reservada; transição discreta, sem zoom/piscadas.
- Anterior/próxima, indicadores, swipe e teclado; controles com aria-label
  e foco visível; informar slide atual sem anúncios contínuos de autoplay.
- Autoplay opcional e desligável (7–10 segundos), pausado após interação,
  com página oculta e prefers-reduced-motion. Limpar timers/listeners.
- Usar a ordem/prioridade recebidas. Peso é uma política futura separada:
  não confundir peso com prioridade nem implementar aleatoriedade agora.
- Hooks futuros de impressão/clique receberão apenas ID/posição; nenhuma
  métrica, cookie, coleta de identidade ou integração externa está ativa.
- Preview futuro do Admin reutilizará a mesma coleção/apresentador e
  AdCreative para Desktop/Tablet/Mobile. Ordenação, ativação, período e
  prioridade deverão compartilhar a seleção; não duplicar componentes.

Nenhum deploy, escrita remota, serviço pago ou alteração de campanha.
