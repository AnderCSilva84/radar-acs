# Simplificação editorial da Home — local

A mudança afeta somente NewsFeed com a propriedade home, usada pela Home. Ouvir continua com seu layout anterior; /live, header, hero e publicidade permanecem preservados.

Desktop a partir de 1100 px: duas zonas principais, sete partes editoriais para três partes de Seu Radar. Destaque com imagem 16:9 e título maior; abaixo, cards completos em duas colunas. Uma notícia secundária não herda mais o span de largura total do layout antigo. Até 1099 px, Seu Radar fica depois de todas as notícias; até 600 px, cards secundários ocupam uma coluna.

Seu Radar consolida futebol, Ao Vivo, Ouvir e atalhos de categorias num único bloco com divisores. Nome do time e escudo aparecem uma vez; partidas/placares/horários são somente os dados recebidos. Sem partidas: Nenhum jogo disponível agora. Dados stale recebem aviso de indisponibilidade. Foram removidos apenas da lateral da Home E ainda no Radar e Edição de hoje. O hero continua apresentando a edição, com leitura do roteiro.

Paleta existente aplicada apenas à seção nova. Imagem editorial aprovada e fallback Radar continuam usando EditorialVisual; proporções reservadas. Escudo do Botafogo preservado. Nenhuma alteração de dados, backend, Alexa, Scheduler ou produção.

Verificações: 195 testes frontend e 60 testes navegador aprovados. Testes direcionados finais verificam seis larguras (375, 390, 430, 768, 1280, 1440), proporção das imagens, ordem das zonas, ausência de overflow/erros JS, dimensões estáveis após carregamento de fontes e divisores visíveis. Build de produção PASS. Suíte frontend foi executada com dois workers para limitar disputa de recursos de imports lazy, sem alterar timeouts ou aplicação.

Capturas locais com conteúdo da edição arquivada, sem fabricar notícias: frontend/review/home-editorial/home-editorial-desktop.png, home-editorial-tablet.png e home-editorial-mobile.png. Ajustes de header/skip-link usados apenas na captura evitam artefatos do screenshot; a aplicação mantém seu comportamento original.

Sem deploy, geração, OpenAI, uploads ou escritas remotas.
