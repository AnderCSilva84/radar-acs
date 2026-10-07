// Minimal structures observed in the real diagnostic; prose is synthetic, not a copied report.
const prose = 'O clube informou nesta segunda-feira os detalhes da preparação para a próxima partida do campeonato. A comissão técnica explicou como os jogadores participaram das atividades realizadas no centro de treinamento.';
module.exports = {
 ge: `<meta property="article:published_time" content="2026-10-05T10:00:00-03:00"><main itemscope itemtype="http://schema.org/NewsArticle"><article itemprop="articleBody"><article class="cxm-block-video__player-wrapper"></article><div class="content-text"><p class=" content-text__container ">${prose}</p></div></article></main>`,
 agencia: `<meta property="article:published_time" content="2026-10-06T10:00:00-03:00"><main class="main-site"><div class="region region-content"><h1>Comissão apresenta os detalhes da preparação</h1><div class="content"><p>${prose}</p></div><section class="ultimas-noticias-node"><p>Assine nossa newsletter e compartilhe as notícias com os amigos.</p></section></div></main>`,
 github: `<?xml version="1.0"?><rss><channel><item><title>Preparação da equipe</title><link>https://github.blog/news/preparacao/</link><pubDate>Tue, 06 Oct 2026 12:00:00 GMT</pubDate><content:encoded><![CDATA[<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.0 Transitional//EN" "http://www.w3.org/TR/REC-html40/loose.dtd"><p>${prose}</p>]]></content:encoded></item></channel></rss>`,
 google: '<main><h1>Google DeepMind</h1><a href="/innovation-and-ai/models-and-research/google-deepmind/noticia-real/">Detalhes de uma matéria específica</a></main>',
 prose
};
