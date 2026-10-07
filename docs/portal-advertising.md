# Portal público e patrocínio direto

Home e histórico são públicos. Administração usa o mesmo Firebase ID token validado, com revogação e comparação exata ao ADMIN_UID. A lógica de autorização não foi substituída; o handler existente recebe validação e repositório separados para publicidade.

## Dados e custo

Documento `settings/advertising`, independente de `settings/editorial`, com até 50 campanhas e payload de 100 KB. O endpoint público `GET /api/advertising` faz uma leitura, filtra campanhas ativas e com período válido em America/Belem e retorna somente ID, anunciante, campanha, imagem, destino, alt, período e posição. Nunca retorna contato, observações internas ou configuração editorial.

O frontend carrega campanhas uma vez por visita; todos os AdSlots reutilizam o resultado, inclusive ao navegar ao histórico. Sem polling. Cada salvamento administrativo faz um PUT e uma escrita consolidada. Nenhuma escrita de impressão/clique. Atualizações de publicidade ficam visíveis após refresh; não há listener em tempo real.

GET/PUT `/api/admin/advertisers` usam a autorização existente. Não há endpoint público de escrita. Regras Firestore seguem negando todo acesso direto do cliente. Nenhuma alteração em preferências, eventos, seleção de notícias ou pipeline.

## Imagens e transparência

O editor valida JPG/JPEG, PNG e WebP até 5 MB (extensão, MIME, assinatura e decodificação); dimensões até 10.000 px por lado e 40 megapixels. A prévia continua local até Salvar campanha. Nesse momento, `uploadCreative()` utiliza a mesma sessão Firebase Auth e envia ao bucket `radar-acs.firebasestorage.app`, caminho `advertising/{campaignId}/{uuid}.{ext}`. Somente o UID superadmin pode criar/excluir arquivos; atualização/sobrescrita e listagem são negadas. Outros caminhos são fechados. GET dos criativos é público para apresentação no portal. As regras não decodificam o binário: assinatura/dimensões são validações do cliente; tamanho, MIME, caminho e autorização são impostos também no Storage.

A URL pública HTTPS sem download token é salva pela API existente, após sucesso do upload. Não se persiste arquivo/base64 no Firestore. Erro de upload não salva campanha. Erro posterior no PUT preserva rascunho e arquivo para nova tentativa, reutilizando o upload em memória. Não apagamos automaticamente o arquivo após erro ambíguo: a API pode ter concluído a gravação. Arquivos antigos ou abandonados podem permanecer no bucket; limpeza automatizada não faz parte desta correção. Não usar TTL geral: apagaria criativos ainda referenciados. Custo de armazenamento/tráfego segue Blaze; não há promessa de custo zero.

A URL de banner hospedado externamente continua aceita. Seleção local torna essa URL opcional no formulário; ela é preenchida após o upload. Object URLs são revogadas quando removidas/substituídas/desmontadas. Link de anúncio continua usando noopener noreferrer sponsored e no-referrer.
`AdCreative` é compartilhado entre portal e editor. `imageFit` (contain por padrão, ou cover) e `ctaText` opcional (60 caracteres) são adições compatíveis ao contrato; não substituem os campos antigos. Preview não navega; Testar link abre destino HTTPS separado. Período/status são administrativos, não parte do anúncio público. Rascunho designa edição local não salva; os estados persistidos continuam derivados de active + datas.

Slots horizontais usam 1200×400, exceto HOME_TOP (1200×300); SIDEBAR usa 600×750. São proporções do mesmo componente público, não garantia de tamanho fixo do layout. Desktop 1440, Tablet 768 e Mobile 390 são containers escalados; sidebar usa largura de referência de 300 px. Diferença de proporção acima de 25% gera aviso, nunca bloqueio. O sidebar público permanece oculto fora do breakpoint desktop. Nenhuma leitura/escrita remota é feita para gerar prévias ou metadados.

Slots HOME_TOP, HOME_MIDDLE, HOME_BOTTOM, HISTORY, SIDEBAR (desktop) e SPECIAL_SPONSOR. Sem campanha, não há espaço vazio. Campanhas são ordenadas por ID; havendo várias no mesmo slot, exibe-se a primeira elegível. Banner que falha é removido, mantendo o conteúdo. Publicidade e patrocínio são identificados explicitamente e não usam o estilo de notícia.

Datas inicial/final inclusivas. Estados: ATIVA, AGENDADA, ENCERRADA e INATIVA. Contato comercial e observações aparecem apenas no editor administrativo. Nenhum patrocinador fictício é criado em produção.

## Radar e interface

AnimatedRadar usa SVG/CSS com círculos, eixos, varredura por transform e pulsos de opacity. Pontos são representação editorial abstrata, limitada a cinco notícias, sem coordenadas geográficas. Sem biblioteca adicional, timers ou requestAnimationFrame. Reduced motion desativa animações. Layout mobile first, lead editorial, grid e arquivo com capas.

As notícias usam somente conteúdo já retornado pela API. Não são inventados textos completos, imagens ou datas ausentes. Roteiro integral e fontes continuam disponíveis. Eventos e capas existentes são preservados.

## Testes e extensões

Fixtures de publicidade e credenciais simuladas existem exclusivamente nos testes. Browser tests interceptam Firebase Auth e APIs administrativas, sem autenticação real, senha do proprietário, banco ou geração.

Impressões/cliques podem ser adicionados futuramente por callbacks no AdSlot e infraestrutura própria após análise de custo e privacidade. Não há analytics ou pixel automático nesta etapa.

Deploy necessário: somente radarApi e Hosting. Nenhuma Function de geração, Scheduler, Alexa, IAM, Storage, Rules ou índice.
