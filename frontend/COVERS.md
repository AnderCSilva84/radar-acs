# Capas — Fase 2.1

## Registro e assets

`src/services/covers.js` centraliza IDs, nomes, descrição, tipo visual e asset público. Opções ativas: `radar`, `acs`, `radar-news`. Radar continua default. `appearance.cover` mantém a chave de armazenamento `radar-acs.preferences.v1`.

O Vite descobre a extensão real dos nomes base `logo-acs` e `capa-radar` em `frontend/public`; aceita PNG/JPG/JPEG/WebP/SVG/AVIF. Arquivo ausente ou ambíguo interrompe o build com erro claro; nenhuma URL/extensão é inventada. O bundle recebe somente os caminhos públicos, sem caminhos locais do sistema.

Arquivos encontrados nesta revisão:

- `public/logo-acs.png`: 162.815 bytes; original intacto.
- `public/capa-radar.png`: 1.871.911 bytes (aprox. 1,79 MiB); original intacto, sem conversão ou redução de qualidade.

## Composição e acessibilidade

Radar mantém o SVG de círculos, scan e pontos; adiciona assinatura ACS discreta. ACS combina SVG azul/digital e logo institucional maior. `BrandSignature` referencia a mesma logo: alt ACS Informática no preview; miniaturas decorativas têm alt vazio.

Radar News referencia a imagem fornecida com `object-fit: cover`, proporção 16:9 e posição central. A proporção nativa é praticamente 16:9, evitando corte agressivo. Não sobrepõe outra saudação grande nem outra logo. Acrescenta apenas uma faixa discreta com data/título disponíveis, ou fallback neutro. A imagem é decorativa (alt vazio); texto acessível da saudação é fornecido uma vez na composição. Os textos incorporados à imagem não são extraídos nem tratados como notícias do briefing.

Os mesmos caminhos locais são reutilizados por thumbnail/preview, com lazy loading e decoding async; o navegador compartilha o download/cache do recurso. Testes verificam um request por asset antes do reload, sem URL externa. Nenhuma cópia do asset é criada no código-fonte; `dist` recebe os assets pelo build Vite normal. Densidade compacta altera o texto nas capas SVG; não comprime a arte Radar News.

## Migração local

`horizon`, `pulse` e IDs desconhecidos normalizam para `radar`, preservando as prioridades editoriais e a densidade válidas. A leitura não grava automaticamente; Salvar preferências persiste o ID normalizado. Não há opções antigas visíveis nem gravação Firestore.

## Extensão futura (somente conceito)

O registro separa identidade estável e renderer. Hoje existe apenas a seleção manual `appearance.cover` (defaultCover). Futuramente um resolvedor poderia receber `contextualCover`, `scheduledCover` e `defaultCover`, nessa ordem de prioridade, retornando `selectedCover`. Não há esse resolvedor, calendário ou automatização nesta fase.

Capas por dia poderiam usar monday/tuesday/wednesday/thursday/friday/saturday/sunday, ou IDs semânticos. Eventos poderiam usar elections/christmas/new-year/cirio/world-cup/birthday/special-tech-event. Capas eleitorais devem ser institucionais e neutras, sem candidatos, partidos, números ou propaganda.

Uma futura entrada `type: generated` poderá referenciar um asset previamente produzido. Nenhuma geração de imagem, API OpenAI, Function, Storage, Firestore ou Scheduler foi criado. Reutilização em APL/Echo Show será outra fase.
