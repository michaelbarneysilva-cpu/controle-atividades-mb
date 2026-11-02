# Ajustes em Atividades e Compras — Design (incremento)

> Este documento é um incremento sobre
> `2026-10-29-controle-de-atividades-e-compras-design.md`. O app já está em
> produção (GitHub Pages) e instalado no celular do Michael; este incremento
> cobre o próximo lote de ajustes pedidos por ele depois de usar o app de
> verdade.

## Intenção e por quê

Depois de instalar e começar a usar o app, o Michael percebeu que faltam
ações básicas de manutenção dos dados (editar, excluir), um jeito de
destacar o que é mais urgente, um campo de quantidade nas compras, busca por
palavra, e encontrou um bug visual/layout na tela de Compras.

## Goals

- **Editar e excluir** qualquer atividade ou compra, pendente ou no
  histórico — nunca ficar "presa" com um dado errado.
- **Prioridade**: marcar/desmarcar uma atividade ou compra como prioritária.
  Itens prioritários sempre aparecem no topo da lista; o resto segue pela
  ordem de inclusão (como já é hoje). Em Compras, quando o agrupamento por
  destino estiver ativo, os prioritários aparecem todos juntos no topo,
  acima de qualquer grupo — **decisão do Michael**.
- **Quantidade** (Compras): novo campo numérico editável — "quantidade a
  comprar".
- **Busca por palavra**: um campo de busca em Atividades e outro em
  Compras, filtrando por descrição **e observação** — **decisão do
  Michael**.
- **Corrigir o layout de Compras**: a barra de adicionar item (descrição +
  valor + destino + botão) não cabe na largura do celular, o que empurra o
  botão de salvar e o menu inferior para fora da área visível. Precisa
  quebrar em mais de uma linha em telas estreitas.
- Seguir aproveitando o modal já existente (usado hoje para concluir
  atividade / mudar status de compra) para editar e para excluir, em vez de
  criar uma tela nova — **decisão do Michael**: menos inconsistência visual.
- Passar o olho geral no layout e deixar mais interativo/bonito dentro do
  que já foi aprovado (cores, cards, tipografia) — sem mudar a direção
  visual já validada.

## Non-goals

- Não mudar a direção visual (cores, fontes, grade) já aprovada no mockup
  original — só polir dentro dela.
- Não adicionar "desfazer exclusão" (lixeira/trash) nesta rodada — exclusão
  com confirmação é suficiente por agora.
- Não usar a quantidade em nenhum cálculo de total ainda (isso fica para
  uma futura tela de análise de gastos).

## Anti-goals

- Excluir um item sem pedir confirmação antes (mantém a regra já definida
  no spec original).
- Quebrar dados já salvos: itens antigos sem `priority`/`quantity` devem
  continuar funcionando normalmente (tratados como "sem prioridade" /
  "quantidade 1").

## Decisões já tomadas (com Michael, ou por mim como builder)

- **Prioridade + agrupamento (Compras)**: prioritários sempre no topo
  geral, quebrando os grupos por destino. *(Decisão do Michael.)*
- **Mecanismo de edição**: reaproveitar o modal existente, generalizado
  para aceitar os campos necessários por contexto (descrição, valor,
  destino, quantidade, observação, ou o menu de classificação/status
  conforme a ação). *(Decisão do Michael.)*
- **Escopo da busca**: descrição + observação, por palavra, filtro ao
  digitar (live), aplicado dentro da aba atualmente visível (Pendentes ou
  Histórico/Realizadas). *(Decisão do Michael + escopo por aba — decisão
  minha como builder, consistente com o fato de pendentes/histórico já
  serem listas e abas separadas.)*
- **O que a edição cobre, por tipo** (decisão minha como builder, pela
  consistência com o que já existe):
  - Atividade: descrição e observação. (Classificação de execução só
    muda reabrindo a atividade — fluxo que já existe — não faz parte da
    edição.)
  - Compra: descrição, valor, destino, quantidade e observação. (Status
    só muda pelo fluxo dedicado de mudar status/reabrir — não faz parte
    da edição.)
- **Prioridade é uma ação instantânea** (sem modal de confirmação) — é
  reversível e de baixo risco, então um toque no ícone já marca/desmarca.
  *(Decisão minha como builder.)*
- **Exclusão sempre pede confirmação** pelo mesmo modal (modo
  "confirmar", sem campos), reaproveitando a regra que já estava prevista
  no spec original. *(Decisão minha como builder.)*
- **Itens antigos sem os campos novos**: tratados como `priority: false` e
  `quantity: 1` até serem editados. *(Decisão minha como builder — evita
  qualquer migração de dados.)*

## O que fica a cargo de quem for construir

- Layout exato dos novos ícones de ação nos cards (ordem, espaçamento,
  rótulos de acessibilidade).
- Cor/estilo exato do destaque visual de "prioridade" no card (ex.: borda
  lateral colorida), dentro da paleta já aprovada.
- Forma exata de quebrar a barra de adicionar item em Compras em telas
  estreitas (quantas linhas, o que fica em cada uma).
