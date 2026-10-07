# Editorial V2 — hotfix local da extração

Sem deploy, geração ou publicação. Ranking, preferências e limiar de 25 palavras permanecem iguais.

## Evidências do diagnóstico real

GE usa `main` NewsArticle, `article itemprop="articleBody"` e artigos aninhados de vídeo. A regex anterior terminava no primeiro fechamento interno, antes dos parágrafos. O extrator percorre elementos com uma pilha, preservando o corpo externo.

Agência Brasil apresenta parágrafos no `main`; o extrator anterior limitava-se a `article` ou classes específicas de parágrafos. Agora elementos semânticos são reconhecidos, excluindo navegação, rodapé, publicidade e relacionados identificáveis.

O RSS do GitHub inclui DOCTYPE HTML dentro de CDATA. Isso não declara entidade XML externa. A proteção continua rejeitando DOCTYPE/ENTITY fora de CDATA; o conteúdo completo do item é preferido à descrição curta.

## Contratos

Datas: ISO, brasileiro dia/mês/ano e RFC com fuso. JSON-LD e metadados reconhecidos são tentados com origem registrada. Ausência é `DATE_UNKNOWN`, nunca hoje. `updated` é explicitamente identificado no Atom; a janela temporal continua aplicada pelo ranking existente.

Evidência: `FULL_EVIDENCE` exige corpo com ao menos duas frases completas e 25 palavras; `PARTIAL_EVIDENCE` identifica metadata com ao menos 25 palavras; demais são insuficientes. São indicadores de extração, não provas semânticas nem autorização para inventar contexto. Metadata parcial não autoriza aprofundamento além dos fatos extraídos. A validação de redação permanece independente.

Páginas: conteúdo editorial marcado é `ARTICLE_PAGE`; seção sem metadata editorial é `DISCOVERY_PAGE`. Links ainda não abertos ficam `UNVERIFIED_CANDIDATE`, não tratados como artigos comprovados. Seções Google DeepMind/Research não oferecem evidência publicável por si só.

403 é `SOURCE_BLOCKED`, sem bypass ou tentativa alternativa. Limites originais de requests, páginas, tempo e bytes preservados.

## Teste real 2 — 2026-10-06

315 testes locais aprovados. Mesmas sete fontes, 16 requests de coleta, oito aberturas de páginas candidatas. 60 candidatos; 12 datas resolvidas, 48 desconhecidas, oito fora da janela; três válidos (dois GE Botafogo, um Agência Brasil). Evidência: 12 completa, uma parcial, 47 insuficientes. Classificação: 14 artigos, duas páginas de descoberta, 44 candidatos ainda não verificados.

Pool útil apenas para edição reduzida de três notícias. Meta de 12–20 candidatos válidos não alcançada. GitHub tinha datas antigas na seleção disponível; Google incluiu seções; a janela e os limites impedem aprovar candidatos não verificados. Concursos/carreira, economia e clima continuam com lacunas de cobertura, sem novas fontes artificiais.

Fixtures mínimas preservam as estruturas observadas, com texto sintético claramente identificado; não guardam reportagens integrais. Resultado local: `.local-editorial-v2-real-collection.json`. Nenhuma chamada OpenAI ou escrita remota.
