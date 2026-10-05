# Radar ACS — Frontend/PWA, fase 1.1

React + Vite + JavaScript + CSS. Home, histórico paginado pela API e preferências locais. Sem autenticação, publicação, geração, player MP3 ou acesso direto ao Firestore. Veja [PHASE-2.md](PHASE-2.md) para contrato, custo, segurança e IDs das capas.

## Localhost

Na pasta `C:\Users\ander\projetos\radar-acs\frontend`:

```powershell
npm install
npm run dev
```

Abra `http://localhost:5173`. A porta é fixa: se estiver ocupada, o Vite informa erro.

Uma consulta inicial GET, sem polling ou retry automático. A ação Tentar novamente faz uma nova consulta. `VITE_RADAR_API_URL` pode configurar outro endpoint público somente em desenvolvimento; não colocar secrets no frontend.

## API real e CORS

A API real retorna HTTP 200, mas não envia `Access-Control-Allow-Origin` para localhost. Com autorização do usuário, o Vite usa exclusivamente no desenvolvimento um proxy `/api/radar/latest` para o GET real existente. Nenhuma configuração de produção foi modificada.

O build usa `/api/briefing/latest` na mesma origem do frontend. O `firebase.json` prepara Hosting com `public: frontend/dist`: primeiro encaminha `/api/**` para a Function existente `radarApi` em `us-east1`, preservando o caminho, depois aplica fallback SPA para `/index.html`. Não cria Function nem exige CORS adicional no navegador. Essa configuração Hosting ainda não foi implantada.

Cache: documentos e caminhos SPA usam `no-cache` (revalidação); assets versionados em `/assets/**` usam um ano e `immutable`; `/api/**` usa `no-store`, além do header existente da API. Sem pinTag, deploy de Functions ou alteração do backend nesta preparação.

O contrato local preserva `titulo`, `data`, `roteiroAlexa`, `audioUrl` e acrescenta `noticias[]`. Cada notícia projeta somente `id`, `categoria`, `titulo`, `resumo`, `fonte` quando existentes e `sourceUrl` válida HTTP/HTTPS sem credenciais. O campo publicado `url` é adaptado para `sourceUrl`; tracking conhecido é removido sem alterar parâmetros funcionais. Dados internos não são expostos. O GET reutiliza o documento da consulta existente (`limit(1)`): nenhuma consulta/leitura adicional.

A API de produção já retorna notícias. Para respostas antigas ou sem notícias, o frontend mantém o convite para ler o roteiro; não reconstrói notícias a partir dele. Os testes de navegador utilizam a edição editorial existente como fixture, sem chamadas de produção.

Ler briefing abre um diálogo de leitura em texto. O fallback oferece Ler roteiro. Indicador Online aparece somente após carregar a API com sucesso, incluindo resposta sem edição; não indica conexão com Alexa. O hero foi compactado mantendo o radar, inclusive abaixo do texto em telas pequenas. Em 1280px o título Seu Radar hoje aparece antes de 720px de altura.

## PWA

Manifest com nome Radar ACS, short name Radar, display standalone, cores e ícones. Esta fase prepara instalação; não há service worker, cache de briefings ou funcionamento offline. Sem política de cache que possa servir uma edição antiga como atual.

## Verificação

```powershell
npm test
npm run build
npm run test:browser
```

Fixtures são exclusivas dos testes. Testes de navegador usam Chrome instalado no Windows (ou `RADAR_CHROME_PATH`), mockam respostas para testar telas e não consultam o Firestore. Testes de viewport: 375, 390, 430, 768 e 1280 pixels; diálogo, teclado, overflow, feed, radar e estados.
