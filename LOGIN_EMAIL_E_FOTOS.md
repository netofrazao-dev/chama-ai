# Login por e-mail + foto no pedido

> **SQL novo: `0007_fotos_pedidos.sql`.** Rode no SQL Editor. Idempotente.

## Antes de tudo: o que eu tinha e não tinha construído

Você perguntou se eu havia feito os 5 itens da lista de prioridades. **Fiz só o item 1** (concluir + avaliar). Aquela lista era o mapa do que falta, não do que entreguei.

Agora entregando o **item 2** (foto no pedido) e o login por e-mail que você sugeriu.

Continuam pendentes: **painel admin** (3), **créditos por PIX** (4) e **modo rápido em tempo real** (5).

---

## Login por e-mail

Agora a tela de entrada tem duas abas: **Pelo celular** e **Pelo e-mail**. O e-mail resolve o problema do Twilio de vez, porque o Supabase envia e-mail por conta própria, sem provedor externo.

### ⚠️ Passo obrigatório no Supabase

Por padrão o Supabase manda um **link mágico** por e-mail, não um código. Para chegar o código de 6 dígitos que a tela pede:

1. Vá em **Authentication → Emails** (ou "Email Templates") → template **Magic Link**.
2. Inclua `{{ .Token }}` no corpo do e-mail. Por exemplo:

   ```
   Seu código do Chama Aí é: {{ .Token }}
   ```
3. Salve.

Sem isso, o e-mail chega sem código e a pessoa não consegue entrar.

> O envio de e-mail nativo do Supabase tem limite baixo (poucos por hora), o que serve bem para testes. Para produção, configure um SMTP próprio em **Project Settings → Auth → SMTP**.

### Detalhe importante: o WhatsApp

O Chama Aí conecta as pessoas pelo WhatsApp. Quem entra pelo celular já tem o número — mas quem entra por e-mail ficaria **sem contato nenhum**, e ninguém conseguiria falar com essa pessoa.

Por isso, quem entra por e-mail agora informa o WhatsApp no primeiro acesso, com a explicação de que o número só aparece para quem fechar serviço com ela.

## Foto no pedido

No passo "Conte o que é", dá para anexar até 3 fotos (a câmera abre direto no celular). O profissional vê as fotos ao abrir o pedido e pode tocar para ampliar.

Isso muda a qualidade do orçamento: quem vê o quintal dá um preço certo em vez de chutar.

**Segurança do bucket:** leitura é pública (a foto precisa aparecer para quem nem entrou), mas cada pessoa só grava dentro da própria pasta e só apaga o que enviou. Limite de 5 MB por foto, só formatos de imagem.

## Testado

- migration `0007` rodada **duas vezes** sem erro (idempotente) ✓
- bucket criado com limite e tipos corretos ✓
- a vitrine passou a devolver as fotos, não só um "tem foto" ✓
- as **8 migrations** aplicadas do zero em banco limpo ✓
- build de produção limpo ✓

## Roteiro de teste

1. Rode o `0007`.
2. Ajuste o template de e-mail (passo obrigatório acima).
3. Saia da conta, escolha **Pelo e-mail**, entre com um e-mail seu de verdade.
4. Confira que ele pede nome **e WhatsApp** no primeiro acesso.
5. Peça um serviço anexando uma foto.
6. Entre com outra conta como prestador e veja a foto no pedido.
