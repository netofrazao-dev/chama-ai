# Painel admin, créditos por PIX e modo rápido

> **SQL novo: `0008_creditos_e_admin.sql`.** Rode no SQL Editor. Idempotente.

## 1. Login não cai mais no perfil

Você apontou algo importante de produto: se a primeira tela depois de entrar oferece "quero oferecer meu serviço", o app parece ser só para quem trabalha — e afasta justamente quem chegou atrás de ajuda.

Duas mudanças:

- Quem entra sem uma ação pendente **cai no feed**, não no perfil.
- O **perfil foi reorganizado**: o primeiro cartão agora é "Precisa de alguém?" com os botões de pedir serviço e ver meus pedidos. Oferecer serviço virou um convite abaixo ("Você **também** faz algum serviço?"), não a primeira coisa da tela.

## 2. Painel de administração (`/admin`)

Aparece no perfil só para quem é admin. Cinco abas:

- **Resumo** — pessoas, profissionais, pedidos abertos, serviços feitos, orçamentos, contatos usados. Pagamentos a conferir e denúncias abertas ficam destacados em vermelho quando há pendência.
- **Profissionais** — muda o nível (iniciante / verificado / comprovado) com um toque, e bane ou desbane.
- **Pagamentos** — lista as compras. Um botão "Recebi — liberar N contatos" credita na hora.
- **Denúncias** — resolve ou bane direto dali.
- **Contatos** — histórico de contatos cobrados, com botão de devolver quando o cliente sumiu.

Segurança: as listas do admin são filtradas no próprio banco. Quem não é admin recebe **lista vazia**, mesmo chamando direto a API.

## 3. Créditos por PIX

O prestador escolhe o pacote (10 / 30 / 100 contatos), o app mostra **QR Code e copia-e-cola**, ele paga e você confirma no painel.

Sem gateway de pagamento de propósito: sem taxa, sem CNPJ, sem contrato — o que faz sentido no volume de Breves. Quando crescer, troca-se a confirmação manual por webhook sem mexer no resto.

**Configure sua chave PIX** (senão a tela avisa que ainda não está disponível):

```sql
update public.configuracoes set valor = 'SUA-CHAVE-PIX' where chave = 'pix_chave';
update public.configuracoes set valor = 'SEU NOME'      where chave = 'pix_nome';
```

Os preços dos pacotes ficam na tabela `pacotes_creditos` — dá para mudar sem republicar o app.

## 4. Modo rápido em tempo real

O prestador liga o interruptor "Ficar disponível agora" e passa a ver os chamados urgentes **chegando na tela sem recarregar**. Toca em "Pegar esse chamado" e o serviço é dele.

O caso difícil aqui é a corrida: dois prestadores tocando ao mesmo tempo. Quem decide é o banco, não a tela — o primeiro leva, o segundo recebe "outra pessoa pegou primeiro" em vez de roubar o chamado.

## Testado contra PostgreSQL 16

- compra fica pendente e **não credita** antes do pagamento ✓
- prestador **não consegue** confirmar o próprio pagamento ✓
- admin confirma → crédito vai de 0 para 30 ✓
- confirmar duas vezes **não credita em dobro** ✓
- não-admin recebe **zero linhas** nas listas do painel ✓
- corrida do modo rápido: primeiro recebe `true`, segundo `false`, sem roubo ✓
- prestador fora da área é bloqueado ao tentar aceitar ✓
- payload PIX validado campo a campo, com CRC conferido contra o vetor padrão ✓
- migration rodada **duas vezes** sem erro ✓
- as **9 migrations** aplicadas do zero em banco limpo ✓
- build de produção limpo ✓

## Depois de rodar o SQL

1. Configure a chave PIX (comando acima).
2. Entre no app e vá em **Perfil** — deve aparecer o botão **Administração**.
3. Repare que o primeiro cartão do perfil agora é o de contratar, não o de trabalhar.
4. Como prestador, ligue "Ficar disponível agora" e peça um serviço "pra já" de outra conta para ver o chamado chegar sozinho.
