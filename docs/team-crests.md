# Escudos dos times — implementação local

O registro `frontend/src/services/teamCrests.js` contém somente URLs copiadas de fontes verificadas. Primeira entrada: Botafogo-RJ, escudo do cabeçalho da página oficial https://botafogo.com.br/simbolos. A mesma página descreve o escudo atual, preto com Estrela Solitária. URL recebida da página, HTTP 200, PNG de 1.435 bytes em largura otimizada de 128 px. Verificado em 05/10/2026. Não há derivação de URL por ID de provider, Google Images ou associação aproximada de nomes.

Catálogo expõe `name`, `series`, `crestUrl` e `crestSource`, preservando `division` para compatibilidade. Os outros 59 clubes ficam sem escudo até verificação de suas fontes. Botafogo-SP e Botafogo-PB nunca herdam o escudo do Botafogo-RJ.

`TeamCrest` reutiliza o registro pequeno, sem importar o catálogo completo nas rotas públicas. Imagens externas com dimensões reservadas, object-fit contain, lazy loading, decode assíncrono e referrerPolicy no-referrer. Erro retorna ao símbolo neutro; trocar o clube não reutiliza imagem de outro time. Nenhuma imagem entra no JavaScript ou em Storage. A amostra PNG em review serve somente ao teste visual local e não é publicada.

Busca e selecionados mostram escudo/nome/divisão, preservam teclado e seleção múltipla. Vínculos antigos do Botafogo e IDs de provider permanecem intactos. A Home mostra um escudo maior para um time, composição até quatro e +N para os demais. Ao Vivo mostra os times e, somente quando o provider entrega partidas, os lados recebidos. Placar, horário e adversário nunca são preenchidos pelo registro de escudos.

Frontend: 193 testes aprovados. Build PASS. Bundle principal 269.700 → 271.265 bytes; gzip 85.364 → 85.864; Brotli 73.792 → 74.137. Acréscimo bruto de 1.565 bytes (0,58%). Backend, preferências salvas, Alexa, Scheduler e produção não alterados. Sem deploy.
