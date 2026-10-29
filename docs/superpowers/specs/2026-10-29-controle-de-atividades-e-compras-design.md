# Controle de Atividades e Compras — Design

## Intenção e por quê

Michael hoje anota tarefas e itens de compra em papel, WhatsApp e memória, e
perde o controle disso. Ele quer um único lugar, no próprio celular, prático
e direto, para registrar o que precisa **fazer** e o que precisa **comprar**,
sem depender de internet, servidor ou qualquer custo recorrente. Ele também
quer, com o tempo, olhar para o histórico de compras e enxergar quanto gastou
e com quê.

## Goals

- Um app que roda só no celular do Michael (hoje Android, possivelmente
  Apple no futuro), a custo zero, sem loja de app e sem backend.
- Lista de **Atividades**: cadastro rápido, data de criação automática,
  mover para histórico ao concluir com data de encerramento automática.
- Ao encerrar uma atividade, classificar o grau de execução (não um status
  de andamento) e permitir uma observação livre opcional.
- Lista de **Compras**: cadastro rápido, valor em R$ com máscara (dígitos
  entram da direita para a esquerda, como caixa eletrônico), destino/
  categoria do gasto, status de cumprimento e observação opcional.
- Agrupar a lista de compras pendentes por destino, com opção de desagrupar.
- Tema claro/escuro configurável, cor de destaque azul.
- Dados guardados só no aparelho do Michael (privacidade total, sem conta,
  sem login).
- Visual bonito e cuidado — Michael valoriza isso explicitamente.

## Non-goals

- Sincronizar entre dispositivos ou multiusuário.
- Publicar nas lojas (Google Play / App Store).
- Notificações push, lembretes agendados, integração com calendário.
- Relatórios/gráficos avançados de gastos nesta primeira versão (o campo de
  valor existe para viabilizar isso depois, mas a análise em si fica fora
  de escopo agora).

## Anti-goals

- Qualquer dependência que exija pagamento recorrente (hosting pago, banco
  de dados em nuvem pago, etc.) — custo deve ser zero, permanentemente.
- Complexidade de instalação: não pode exigir loja de app, conta de
  desenvolvedor, ou passos técnicos do Michael além de "abrir o link e
  salvar na tela inicial".
- Perda de dados silenciosa: nunca apagar um item sem confirmação explícita.

## Constraints

- Sem orçamento: zero custo de hospedagem, build ou distribuição.
- Sem servidor: todos os dados residem no próprio celular.
- Precisa funcionar bem tanto em Android quanto, potencialmente, em iPhone
  (troca de aparelho incerta, mas considerada).
- Uso por uma única pessoa (Michael), sem necessidade de contas/login.

## Decisões já tomadas (com Michael, ou por mim como builder)

- **Plataforma/tecnologia**: PWA (Progressive Web App) — HTML/CSS/JS puro,
  instalável na tela inicial, funciona offline via Service Worker, dados
  persistidos em `localStorage`/`IndexedDB` no próprio celular. Decisão do
  Michael: "o que você achar mais funcional e flexível" → PWA cobre Android
  e iPhone com o mesmo código, sem loja, sem custo.
- **Direção visual**: aprovada no mockup — fundo dark/light configurável,
  cards arredondados, abas para Pendentes/Histórico, FAB de adicionar, cor
  de destaque azul (`#2f81f7` → `#58a6ff` em gradiente), nav inferior com
  dois ícones (Atividades / Compras).
- **Atividades — campos**: descrição, data de criação (automática), data de
  encerramento (automática ao mover para histórico), classificação de
  execução (menu, preenchido ao encerrar) e observação (texto livre,
  opcional).
  - Opções do menu de classificação de execução (nomes ajustados por mim,
    ideia validada pelo Michael): *Concluída totalmente*, *Concluída
    parcialmente*, *Executada no mínimo*, *Remarcada*, *Não realizada*.
- **Compras — campos**: descrição, valor em R$ (máscara tipo caixa
  eletrônico), destino (menu: Michael Pessoal, Michael Casa, Mãe, Gravatá,
  Cachorros, Outros), status (menu: *Ok!*, *Pendente*, *Cancelado*) e
  observação (texto livre, opcional).
  - Compras pendentes podem ser exibidas juntas ou agrupadas por destino
    (toggle, configurável e lembrado).
- **Configurações**: tema (Claro/Escuro), cor de destaque, toggle de
  agrupar compras por destino.
- Nenhuma venda nem remoção definitiva sem confirmação (dialog de confirmar
  antes de excluir um item).
- **Compras também têm aba de Histórico**, igual Atividades (já estava
  implícito no mockup aprovado): ao marcar uma compra como *Ok!* ou
  *Cancelado*, ela sai da aba Pendentes e passa para a aba Histórico.
  Compras na aba Pendentes só têm status *Pendente*.
- **Atividades/compras encerradas podem ser reabertas/editadas** (decisão
  minha como builder): o histórico não é somente leitura — Michael pode
  corrigir uma classificação ou observação depois, ou devolver um item
  para a lista ativa caso tenha marcado por engano.
- **Valor da compra é opcional** (decisão minha como builder): pode
  cadastrar o item sem saber o preço ainda e preencher depois; campo vazio
  conta como R$ 0,00 em totais.
- **Hospedagem**: GitHub Pages (gratuito). O código fica num repositório
  GitHub do Michael, publicado via GitHub Pages com HTTPS, permitindo
  instalação real como PWA (ícone na tela inicial, funcionamento offline
  via Service Worker). Decisão do Michael, escolhida sobre a alternativa
  de abrir um arquivo local (que não instala como app de verdade).

## O que fica a cargo de quem for construir

- Escolha de biblioteca de máscara monetária (ou implementação simples
  manual) — qualquer abordagem sem dependência paga serve.
- Estrutura de arquivos do PWA (manifest.json, service worker, ícones).
- Esquema exato de armazenamento local (localStorage simples vs.
  IndexedDB) — dado o volume de dados esperado (uso pessoal), localStorage
  com JSON é suficiente; pode evoluir para IndexedDB se necessário.
- Exportar/importar backup (mencionado no mockup de Configurações como
  ideia futura) — incluir uma versão simples (exportar/importar um arquivo
  JSON) é desejável nesta primeira versão, mas o formato exato do arquivo
  fica a critério do builder.
- Paleta exata de cores claro/escuro, tipografia e espaçamentos — seguir a
  direção aprovada no mockup (`.superpowers/brainstorm/.../app-mockup-v2.html`)
  como referência visual.
- Ordenação padrão das listas (ex.: mais recente primeiro) — decisão
  simples, não precisa confirmar com o Michael.
