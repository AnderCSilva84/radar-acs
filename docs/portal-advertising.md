# Portal público e patrocínio direto

Home e histórico são públicos. Administração usa o mesmo Firebase ID token validado, com revogação e comparação exata ao ADMIN_UID. A lógica de autorização não foi substituída; o handler existente recebe validação e repositório separados para publicidade.

## Dados e custo

Documento `settings/advertising`, independente de `settings/editorial`, com até 50 campanhas e payload de 100 KB. O endpoint público `GET /api/advertising` faz uma leitura, filtra campanhas ativas e com período válido em America/Belem e retorna somente ID, anunciante, campanha, imagem, destino, alt, período e posição. Nunca retorna contato, observações internas ou configuração editorial.

O frontend carrega campanhas uma vez por visita; todos os AdSlots reutilizam o resultado, inclusive ao navegar ao histórico. Sem polling. Cada salvamento administrativo faz um PUT e uma escrita consolidada. Nenhuma escrita de impressão/clique. Atualizações de publicidade ficam visíveis após refresh; não há listener em tempo real.

GET/PUT `/api/admin/advertisers` usam a autorização existente. Não há endpoint público de escrita. Regras Firestore seguem negando todo acesso direto do cliente. Nenhuma alteração em preferências, eventos, seleção de notícias ou pipeline.

## Imagens e transparência

Sem Firebase Storage configurado no projeto para upload de banners: nesta etapa somente URL pública HTTPS, sem criar serviço, bucket, regras ou custo de Storage. Não há upload de arquivos nem proxy de imagem. URLs com credenciais ou parâmetros sensíveis são rejeitadas. Imagens usam lazy loading, decoding async e no-referrer; links usam noopener noreferrer sponsored.

Slots HOME_TOP, HOME_MIDDLE, HOME_BOTTOM, HISTORY, SIDEBAR (desktop) e SPECIAL_SPONSOR. Sem campanha, não há espaço vazio. Campanhas são ordenadas por ID; havendo várias no mesmo slot, exibe-se a primeira elegível. Banner que falha é removido, mantendo o conteúdo. Publicidade e patrocínio são identificados explicitamente e não usam o estilo de notícia.

Datas inicial/final inclusivas. Estados: ATIVA, AGENDADA, ENCERRADA e INATIVA. Contato comercial e observações aparecem apenas no editor administrativo. Nenhum patrocinador fictício é criado em produção.

## Radar e interface

AnimatedRadar usa SVG/CSS com círculos, eixos, varredura por transform e pulsos de opacity. Pontos são representação editorial abstrata, limitada a cinco notícias, sem coordenadas geográficas. Sem biblioteca adicional, timers ou requestAnimationFrame. Reduced motion desativa animações. Layout mobile first, lead editorial, grid e arquivo com capas.

As notícias usam somente conteúdo já retornado pela API. Não são inventados textos completos, imagens ou datas ausentes. Roteiro integral e fontes continuam disponíveis. Eventos e capas existentes são preservados.

## Testes e extensões

Fixtures de publicidade e credenciais simuladas existem exclusivamente nos testes. Browser tests interceptam Firebase Auth e APIs administrativas, sem autenticação real, senha do proprietário, banco ou geração.

Impressões/cliques podem ser adicionados futuramente por callbacks no AdSlot e infraestrutura própria após análise de custo e privacidade. Não há analytics ou pixel automático nesta etapa.

Deploy necessário: somente radarApi e Hosting. Nenhuma Function de geração, Scheduler, Alexa, IAM, Storage, Rules ou índice.
