# Milestone 1 — parte 3: reputação e transparência

> **SQL novo: `0006_conclusao_avaliacao.sql`.** Rode no SQL Editor. É idempotente — pode rodar duas vezes sem quebrar.

## O que entrou

### Conclusão e avaliação (o sistema de confiança finalmente funciona)

Antes, `nota_media` e `total_concluidos` **nunca saíam de zero** — as estrelas, os níveis e os selos eram enfeite. Agora:

- Qualquer um dos dois lados marca o serviço como feito ("O serviço já foi feito" / "Já terminei esse serviço").
- Ao concluir, os dois se avaliam: 5 estrelas grandes + tags rápidas (Pontual, Caprichoso, Preço justo…) + comentário opcional. Nada obrigatório além da nota.
- A nota do prestador é recalculada automaticamente e aparece na vitrine na hora.
- **Promoção automática de nível:** 3+ serviços com nota ≥ 4 vira "Verificado"; 20+ com nota ≥ 4,5 vira "Comprovado". Ninguém é rebaixado automaticamente.

### Página "Como funciona" (a explicação da cobrança que faltava)

Acessível pelo ícone de interrogação no topo, **sem precisar entrar**. Responde em linguagem simples: cliente nunca paga; prestador só gasta contato quando é escolhido; os 10 primeiros são grátis; depois compra por PIX a partir de ~R$ 3, sem mensalidade e sem vencimento; e se o cliente sumir, o contato é devolvido.

Também diz claramente que a compra por PIX ainda está sendo preparada — melhor admitir do que deixar a pessoa descobrir sozinha.

### Entrar/trocar de conta

Faltava um jeito visível de entrar. Agora tem botão **Entrar** no topo da tela inicial quando ninguém está logado. Para trocar de conta: **Perfil → Sair**, e entrar com outro número.

## Corrigido nesta migration

1. **O prestador não conseguia concluir o próprio trabalho** — só tinha permissão de leitura no pedido. Agora pode atualizar, mas sem conseguir transferir o pedido para outro prestador.
2. **`total_concluidos` era dado morto** — ninguém incrementava. Agora um gatilho cuida.
3. **Dava para avaliar o mesmo serviço várias vezes**, distorcendo a nota. Agora é uma avaliação por pessoa por serviço.
4. A vitrine passou a expor `usuario_id` do prestador — sem isso o cliente não conseguia avaliar quem o atendeu.

## Testado contra PostgreSQL 16

- prestador marca como concluído ✓ e `total_concluidos` sobe (25 → 26) ✓
- cliente avalia ✓, nota recalculada para 5,00 ✓
- **avaliação duplicada: bloqueada** ✓
- nível promovido automaticamente de "verificado" para "comprovado" ✓
- migration rodada **duas vezes seguidas** sem erro (idempotente) ✓
- as 7 migrations aplicadas do zero em banco limpo ✓
- build de produção limpo ✓

## Ainda falta

- **Foto no pedido** (o campo já existe no banco; falta ligar o Storage)
- **Painel admin** (aprovar prestador, ver denúncia, devolver contato)
- **Créditos por PIX** (vai pedir SQL novo)
- **Modo rápido em tempo real**

## Roteiro de teste

1. Rode o `0006` no SQL Editor.
2. Entre como cliente, peça um serviço.
3. Saia (Perfil → Sair), entre com **outro número de teste**, cadastre-se como prestador e mande um preço nesse pedido.
4. Volte para o primeiro número, escolha o orçamento, toque em "O serviço já foi feito" e avalie.
5. Veja a nota aparecer no perfil do prestador na vitrine.
6. Toque no "?" no topo para ler a página de cobrança.
