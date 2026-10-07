# Collection V2 — somente local

Ranking, prioridades, janela temporal e evidência mínima inalterados. Discovery preserva estados pendentes; verificação usa prioridade configurada, cobertura da categoria, metadata promissora e atualidade. Cada fonte tem limite próprio para evitar consumir toda a rede em uma categoria sem resultados.

Orçamento configurável: 40 requests totais, 32 aberturas de artigos, seis por fonte, 120 segundos; máximo 120 descobertas. Para ao atingir 12 válidos deduplicados; não tenta preencher 20. Limite por fonte é registrado separadamente do limite global. Fontes bloqueadas não são repetidas na mesma execução.

Fontes oficiais adicionais avaliadas: Microsoft Developer Blog e portal de notícias do MTE. As páginas verificadas estavam fora da janela; MTE também apresentou extração insuficiente. Nenhuma incluída sem demonstração de utilidade atual. Lacunas em tecnologia/IA, concursos/carreira e economia permanecem explícitas. Clima não é preenchido artificialmente.

Validação real final: 71 descobertos; 35 com dados verificados (28 páginas abertas e sete itens com metadata/feed examinados), 11 válidos em quatro categorias; 36 requests (oito discovery e 28 artigos). Cinco GE Botafogo, cinco Agência Brasil, um GitHub. Não alcançou target de 12, mas superou o mínimo de sete. Limite por fonte encerrou a exploração com candidatos ainda pendentes; não representa ausência de notícias na web.

Datas: 20 resolvidas, 15 desconhecidas após verificação, 36 pendentes; oito fora da janela entre as resolvidas. Evidência entre todas as descobertas: 22 completa, três parcial, 46 insuficiente, incluindo candidatos não verificados; não confundir essa contagem com pool válido. Categorias finais refletem o classificador existente, sem melhoria semântica nesta tarefa.

Houve duas coletas reais de validação: a primeira consumiu 40 requests e evidenciou concentração excessiva por fonte; a final consumiu 36 após o ajuste. Requests de avaliação de fontes são adicionais, separados dos números da coleta final. Nenhuma chamada OpenAI, publicação, escrita remota ou deploy.
