# Ajustes em Atividades e Compras Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar editar/excluir, prioridade com reordenação, campo de
quantidade em compras, busca por palavra, e corrigir o layout quebrado da
tela de Compras — sobre o app PWA já em produção.

**Architecture:** Mesma base vanilla JS/ES modules sem build step. Lógica
pura nova (busca, prioridade, edição) entra em módulos de domínio
existentes (`js/activities.js`, `js/purchases.js`) e um módulo novo
(`js/search.js`), todos com testes via `node --test`. O modal único já
existente (`js/app.js`) é generalizado para aceitar um conjunto
configurável de campos por invocação, em vez de criar uma tela nova.
Renderização e wiring de DOM (`js/render.js`, `js/app.js`, `index.html`,
`css/styles.css`) seguem sem testes automatizados, verificados por QA
manual, como já é o padrão deste projeto.

**Tech Stack:** Vanilla JS (ES modules), `node --test`, HTML/CSS sem
framework. Sem dependências novas.

**Spec:** `docs/superpowers/specs/2026-11-02-ajustes-atividades-compras-design.md`
(incremento sobre `docs/superpowers/specs/2026-10-29-controle-de-atividades-e-compras-design.md`)

## Global Constraints

- Custo zero, sem dependências novas, sem build step — mesmas regras do
  spec original.
- Itens já salvos sem `priority`/`quantity` continuam funcionando sem
  migração: tratar como `priority: false` / `quantity: 1`.
- Excluir sempre pede confirmação (reaproveitando o modal, modo
  "confirmar", sem campos).
- Prioridade é instantânea (sem modal) — toggle direto no ícone.
- Edição cobre: Atividade → descrição + observação. Compra → descrição +
  valor + destino + quantidade + observação. Classificação/status mudam
  só pelos fluxos já existentes (concluir/mudar status/reabrir).
- Busca filtra por descrição + observação, ao digitar, dentro da aba
  visível (Pendentes ou Histórico/Realizadas) de cada seção.
- Em Compras, com agrupamento por destino ativo, itens prioritários
  aparecem todos juntos no topo, acima de qualquer grupo.
- Direção visual já aprovada (cores, tipografia, cards) não muda — só
  polimento dentro dela.

## Review Focus

- Item com `priority`/`quantity` ausentes (salvos antes deste incremento)
  renderiza e edita sem erro, tratado como `false`/`1`.
- Excluir o único item de uma lista mostra corretamente o estado vazio
  ("Nada por aqui."), sem deixar lixo visual (cabeçalho de grupo órfão,
  etc.).
- Editar uma compra trocando o destino, quando o agrupamento por destino
  está ativo, move o card pro grupo novo imediatamente após salvar.
- Busca com acentuação (ex. digitar "racao" encontra "Ração") e busca que
  não bate com nada mostra o estado vazio, não uma lista quebrada.
- Cancelar o modal (editar, excluir ou prioridade — se prioridade também
  passar a usar modal no futuro) não deve alterar nada no item.
- Depois do deploy, o celular do Michael precisa efetivamente receber os
  arquivos novos (não ficar servindo o cache antigo do Service Worker
  indefinidamente).

---

### Task 1: Módulo de busca

**Files:**
- Create: `js/search.js`
- Test: `tests/search.test.js`

**Interfaces:**
- Consumes: nenhuma (módulo novo, independente).
- Produces: `matchesQuery(item, query)`, `filterByQuery(items, query)` —
  usados pela Task 6 (wiring em `app.js`).

- [ ] **Step 1: Escrever os testes falhando**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { matchesQuery, filterByQuery } from '../js/search.js';

test('matchesQuery com query vazia sempre bate', () => {
  assert.equal(matchesQuery({ description: 'Ração', note: '' }, ''), true);
});

test('matchesQuery compara description e note, ignorando acento e caixa', () => {
  assert.equal(matchesQuery({ description: 'Ração premium', note: '' }, 'racao'), true);
  assert.equal(matchesQuery({ description: 'Tênis', note: '' }, 'TENIS'), true);
  assert.equal(matchesQuery({ description: 'Tênis', note: 'comprar na promoção' }, 'promocao'), true);
  assert.equal(matchesQuery({ description: 'Tênis', note: '' }, 'coleira'), false);
});

test('filterByQuery mantém só os itens que batem, preservando a ordem', () => {
  const items = [
    { description: 'Ração', note: '' },
    { description: 'Coleira', note: '' },
    { description: 'Ração extra', note: '' },
  ];
  const result = filterByQuery(items, 'ração');
  assert.deepEqual(result.map((i) => i.description), ['Ração', 'Ração extra']);
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `node --test tests/search.test.js`
Expected: FAIL com "Cannot find module '../js/search.js'" (ou similar —
módulo ainda não existe)

- [ ] **Step 3: Implementar `js/search.js`**

`matchesQuery(item, query)`: normaliza `query` e `${item.description} ${item.note || ''}`
removendo acentos (`.normalize('NFD').replace(/[̀-ͯ]/g, '')`) e
caixa (`.toLowerCase()`); query vazia/`undefined` sempre retorna `true`;
senão retorna se o texto normalizado do item contém o texto normalizado da
query (`.includes(...)`).

`filterByQuery(items, query)`: `items.filter((item) => matchesQuery(item, query))`.

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `node --test tests/search.test.js`
Expected: PASS, 3/3

- [ ] **Step 5: Commit**

```bash
git add js/search.js tests/search.test.js
git commit -m "feat: add word search module with accent-insensitive matching"
```

---

### Task 2: Prioridade e edição em Atividades

**Files:**
- Modify: `js/activities.js`
- Test: `tests/activities.test.js` (adicionar casos)

**Interfaces:**
- Consumes: nenhuma nova.
- Produces: `toggleActivityPriority(activity)`, `updateActivity(activity, { description, note })`,
  `sortActivities(activities)` — usados pelas Tasks 5 (render) e 6 (app.js).
  `createActivity` passa a incluir `priority: false` no objeto retornado
  (campo novo, não quebra consumidores existentes).

- [ ] **Step 1: Escrever os testes falhando**

```js
test('createActivity começa com priority false', () => {
  const activity = createActivity('Pagar conta');
  assert.equal(activity.priority, false);
});

test('toggleActivityPriority alterna o valor', () => {
  const activity = createActivity('Pagar conta');
  const marked = toggleActivityPriority(activity);
  assert.equal(marked.priority, true);
  const unmarked = toggleActivityPriority(marked);
  assert.equal(unmarked.priority, false);
});

test('toggleActivityPriority trata item antigo sem o campo como false', () => {
  const legacy = { id: '1', description: 'Antiga', note: '' };
  const marked = toggleActivityPriority(legacy);
  assert.equal(marked.priority, true);
});

test('updateActivity troca descrição e observação', () => {
  const activity = createActivity('Pagar conta');
  const updated = updateActivity(activity, { description: 'Pagar conta de luz', note: 'vence dia 10' });
  assert.equal(updated.description, 'Pagar conta de luz');
  assert.equal(updated.note, 'vence dia 10');
});

test('updateActivity retorna null para descrição vazia', () => {
  const activity = createActivity('Pagar conta');
  assert.equal(updateActivity(activity, { description: '  ', note: '' }), null);
});

test('sortActivities coloca prioritárias no topo, preservando ordem de inclusão dentro de cada grupo', () => {
  const a = createActivity('A');
  const b = toggleActivityPriority(createActivity('B'));
  const c = createActivity('C');
  const d = toggleActivityPriority(createActivity('D'));
  const sorted = sortActivities([a, b, c, d]);
  assert.deepEqual(sorted.map((x) => x.description), ['B', 'D', 'A', 'C']);
});
```

- [ ] **Step 2: Rodar e confirmar que falham**

Run: `node --test tests/activities.test.js`
Expected: FAIL — `toggleActivityPriority`/`updateActivity`/`sortActivities`
não definidos, e `priority` undefined no objeto de `createActivity`.

- [ ] **Step 3: Implementar em `js/activities.js`**

- `createActivity`: incluir `priority: false` no objeto retornado.
- `toggleActivityPriority(activity)`: `{ ...activity, priority: !activity.priority }`.
- `updateActivity(activity, { description, note })`: retorna `null` se
  `description.trim() === ''`; senão `{ ...activity, description, note }`.
- `sortActivities(activities)`: `[...activities].sort((a, b) => Number(Boolean(b.priority)) - Number(Boolean(a.priority)))`
  (sort estável do JS preserva a ordem original dentro de cada grupo de
  prioridade).

- [ ] **Step 4: Rodar e confirmar que passam**

Run: `node --test tests/activities.test.js`
Expected: PASS, todos os testes (os já existentes + os novos)

- [ ] **Step 5: Commit**

```bash
git add js/activities.js tests/activities.test.js
git commit -m "feat: add priority toggle, edit and priority-first sort to activities"
```

---

### Task 3: Prioridade, quantidade e edição em Compras

**Files:**
- Modify: `js/purchases.js`
- Test: `tests/purchases.test.js` (adicionar casos)

**Interfaces:**
- Consumes: nenhuma nova.
- Produces: `togglePurchasePriority(purchase)`,
  `updatePurchase(purchase, { description, destino, valueCents, quantity, note })`,
  `splitByPriority(purchases)` → `{ priority: Purchase[], rest: Purchase[] }`,
  `sortPurchases(purchases)` — usados pelas Tasks 5 (render) e 6 (app.js).
  `createPurchase` passa a aceitar um 4º parâmetro opcional `quantity = 1`
  e inclui `priority: false` e `quantity` (saneada) no objeto retornado.

- [ ] **Step 1: Escrever os testes falhando**

```js
test('createPurchase começa com priority false e quantity 1 por padrão', () => {
  const purchase = createPurchase('Ração', 'cachorros');
  assert.equal(purchase.priority, false);
  assert.equal(purchase.quantity, 1);
});

test('createPurchase aceita quantity explícita e ignora valor inválido', () => {
  assert.equal(createPurchase('Ração', 'cachorros', 0, 3).quantity, 3);
  assert.equal(createPurchase('Ração', 'cachorros', 0, 0).quantity, 1);
  assert.equal(createPurchase('Ração', 'cachorros', 0, -2).quantity, 1);
});

test('togglePurchasePriority alterna o valor, tratando item antigo sem o campo como false', () => {
  const purchase = createPurchase('Ração', 'cachorros');
  const marked = togglePurchasePriority(purchase);
  assert.equal(marked.priority, true);
  assert.equal(togglePurchasePriority(marked).priority, false);
});

test('updatePurchase troca descrição, destino, valor, quantidade e observação', () => {
  const purchase = createPurchase('Ração', 'cachorros');
  const updated = updatePurchase(purchase, {
    description: 'Ração premium',
    destino: 'michael_casa',
    valueCents: 5000,
    quantity: 2,
    note: 'marca nova',
  });
  assert.equal(updated.description, 'Ração premium');
  assert.equal(updated.destino, 'michael_casa');
  assert.equal(updated.valueCents, 5000);
  assert.equal(updated.quantity, 2);
  assert.equal(updated.note, 'marca nova');
});

test('updatePurchase retorna null para descrição vazia ou destino inválido', () => {
  const purchase = createPurchase('Ração', 'cachorros');
  assert.equal(updatePurchase(purchase, { description: '', destino: 'cachorros', valueCents: 0, quantity: 1, note: '' }), null);
  assert.equal(updatePurchase(purchase, { description: 'Ração', destino: 'invalido', valueCents: 0, quantity: 1, note: '' }), null);
});

test('splitByPriority separa prioritários dos demais, preservando ordem', () => {
  const a = createPurchase('A', 'outros');
  const b = togglePurchasePriority(createPurchase('B', 'outros'));
  const c = createPurchase('C', 'outros');
  const { priority, rest } = splitByPriority([a, b, c]);
  assert.deepEqual(priority.map((x) => x.description), ['B']);
  assert.deepEqual(rest.map((x) => x.description), ['A', 'C']);
});

test('sortPurchases coloca prioritárias no topo, preservando ordem de inclusão', () => {
  const a = createPurchase('A', 'outros');
  const b = togglePurchasePriority(createPurchase('B', 'outros'));
  const sorted = sortPurchases([a, b]);
  assert.deepEqual(sorted.map((x) => x.description), ['B', 'A']);
});
```

- [ ] **Step 2: Rodar e confirmar que falham**

Run: `node --test tests/purchases.test.js`
Expected: FAIL — novas funções não definidas, `priority`/`quantity`
undefined.

- [ ] **Step 3: Implementar em `js/purchases.js`**

- `createPurchase(description, destino, valueCents = 0, quantity = 1)`:
  sanear quantity (`Number.isInteger(quantity) && quantity > 0 ? quantity : 1`),
  incluir `priority: false` e `quantity` saneada no objeto retornado.
- `togglePurchasePriority(purchase)`: `{ ...purchase, priority: !purchase.priority }`.
- `updatePurchase(purchase, { description, destino, valueCents, quantity, note })`:
  retorna `null` se `description.trim() === ''` ou `!(destino in PURCHASE_DESTINATIONS)`;
  senão `{ ...purchase, description, destino, valueCents, quantity: (saneamento igual ao de createPurchase), note }`.
- `splitByPriority(purchases)`: `{ priority: purchases.filter(p => Boolean(p.priority)), rest: purchases.filter(p => !p.priority) }`.
- `sortPurchases(purchases)`: compor com `splitByPriority` —
  `const { priority, rest } = splitByPriority(purchases); return [...priority, ...rest];`.

- [ ] **Step 4: Rodar e confirmar que passam**

Run: `node --test tests/purchases.test.js`
Expected: PASS, todos os testes

- [ ] **Step 5: Commit**

```bash
git add js/purchases.js tests/purchases.test.js
git commit -m "feat: add priority, quantity and edit support to purchases"
```

---

### Task 4: Markup e CSS — busca, ícones de ação, corrigir layout de Compras

**Files:**
- Modify: `index.html`
- Modify: `css/styles.css`

**Interfaces:**
- Consumes: nenhuma (markup/estilo apenas).
- Produces: novos ids/classes que a Task 6 (app.js) vai consumir:
  `#input-search-activities`, `#input-search-purchases` (inputs de busca,
  um em cada seção, acima das abas Pendentes/Histórico); classe
  `.card-actions` e atributo `data-action="priority|edit|delete"` nos
  botões de ação (esses botões são criados em `js/render.js`, Task 5 —
  aqui só o CSS para `.card-actions`/`.card--priority` precisa existir).

- [ ] **Step 1: Adicionar os campos de busca no `index.html`**

Em `#view-activities`, logo após o `<div class="topbar">` e antes de
`<div class="tabs">`: `<input id="input-search-activities" type="text" class="search-input" placeholder="Buscar...">`.
Mesma estrutura em `#view-purchases` com `id="input-search-purchases"`.

- [ ] **Step 2: Corrigir o markup da barra de adicionar compra**

Em `#form-new-purchase`, adicionar a classe `add-bar--wrap` junto de
`add-bar` (`class="add-bar add-bar--wrap"`), sem mudar a ordem dos campos.

- [ ] **Step 3: Adicionar os estilos novos em `css/styles.css`**

- `.search-input`: mesmo visual dos inputs de `.add-bar` (fundo
  `--bg-sunken`, borda `--border`, `border-radius: 10px`, padding e
  `font-size` iguais), `width: 100%`, `margin-bottom: 14px`.
- `.add-bar--wrap`: `flex-wrap: wrap;`. Dentro dela, o primeiro `input`
  (descrição) recebe `flex: 1 1 100%` (ocupa a linha inteira) via seletor
  `.add-bar--wrap input:first-child`; os demais campos (valor, select,
  botão) continuam `flex: 1` numa segunda linha, exceto o `button` que
  mantém `width: 44px` fixo (regra já existe).
- `.card-actions`: `display: flex; gap: 6px; margin-top: 8px; justify-content: flex-end;`.
- `.card-actions button`: botão pequeno e discreto — `width: 32px; height: 32px; padding: 0; border-radius: 8px; font-size: 15px; background: var(--bg-sunken);`.
- `.card-actions button[data-action="priority"].is-active`: destaque
  dourado (ex.: `color: #c9890a; border-color: #c9890a;`) para indicar
  prioridade marcada.
- `.card--priority`: `border-left: 3px solid #c9890a;` (destaque visual do
  card inteiro quando marcado prioritário).

- [ ] **Step 4: Verificação manual**

Abrir `index.html` num navegador (ou via `python -m http.server` como nas
rodadas anteriores) e confirmar visualmente: campos de busca aparecem nas
duas seções; a barra de adicionar compra quebra em duas linhas numa
largura de celular (~375px) sem cortar o botão de salvar nem empurrar o
menu inferior para fora da tela.

Expected: nenhuma sobreposição, botão "+" de Compras sempre visível, nav
inferior sempre visível, em qualquer largura de tela mobile testada.

- [ ] **Step 5: Commit**

```bash
git add index.html css/styles.css
git commit -m "feat: add search inputs and fix purchases add-bar mobile layout"
```

---

### Task 5: Render — ícones de ação, prioridade, quantidade, agrupamento com prioridade no topo

**Files:**
- Modify: `js/render.js`

**Interfaces:**
- Consumes: `toggleActivityPriority`/`sortActivities` (Task 2, só os
  nomes — render.js não chama toggle, só lê `activity.priority`),
  `sortActivities(activities)` de `js/activities.js`; `sortPurchases`,
  `splitByPriority`, `groupByDestino`, `PURCHASE_DESTINATIONS`,
  `PURCHASE_STATUSES` de `js/purchases.js`; `centsToBRL` de `js/money.js`.
- Produces: `renderActivityCard`/`renderPurchaseCard` passam a incluir uma
  `.card-actions` com 3 botões (`data-action="priority"`,
  `data-action="edit"`, `data-action="delete"`, todos com
  `card.dataset.id` já presente no card pai — a Task 6 delega cliques
  nesses `data-action` lendo o `closest('.card')` para achar o id).
  `renderActivitiesList`/`renderPurchasesList` passam a ordenar por
  prioridade internamente (comportamento, não assinatura — assinatura
  não muda).

- [ ] **Step 1: Atualizar `renderActivityCard`/`renderPurchaseCard`**

Em ambas: `card.classList.toggle('card--priority', Boolean(item.priority))`.
Adicionar ao final da função, antes do `return card`, uma `.card-actions`
com 3 `<button type="button">`: prioridade (texto/ícone `★`, com
`data-action="priority"` e classe `is-active` quando `item.priority` for
true), editar (`✎`, `data-action="edit"`), excluir (`🗑`,
`data-action="delete"`).

Em `renderPurchaseCard`, adicionar à `.card-meta` um
`document.createTextNode(\`Qtd: ${purchase.quantity ?? 1}\`)` depois do
valor em R$.

- [ ] **Step 2: Atualizar `renderActivitiesList`**

Antes do loop de renderização, aplicar `activities = sortActivities(activities)`
(import de `sortActivities` de `./activities.js`).

- [ ] **Step 3: Atualizar `renderPurchasesList`**

Quando `grouped` for `true`: usar `splitByPriority(purchases)` — se
`priority.length > 0`, renderizar primeiro um `.group-header` com texto
"⭐ Prioridade" seguido dos cards desse grupo, e só depois seguir com
`groupByDestino(rest)` como já existia (usando `rest` em vez de
`purchases`). Quando `grouped` for `false`: usar `sortPurchases(purchases)`
no lugar do array original antes do loop.

- [ ] **Step 4: Verificação manual**

Rodar a suíte (garante que nada quebrou nos módulos puros) e abrir o app
no navegador: marcar um item como prioritário e confirmar que ele sobe
para o topo (geral, acima dos grupos, em Compras agrupado); marcar
prioridade em dois itens de grupos diferentes e confirmar que os dois
aparecem juntos no topo sob "⭐ Prioridade".

Run: `node --test "tests/*.test.js"`
Expected: PASS (nenhum teste novo nesta task — só verificação de que a
suíte continua verde)

- [ ] **Step 5: Commit**

```bash
git add js/render.js
git commit -m "feat: render priority markers, action icons, quantity and priority-first ordering"
```

---

### Task 6: Wiring — busca, prioridade, editar (modal generalizado) e excluir

**Files:**
- Modify: `js/app.js`

**Interfaces:**
- Consumes: `filterByQuery` (Task 1); `toggleActivityPriority`,
  `updateActivity` (Task 2); `togglePurchasePriority`, `updatePurchase`
  (Task 3); ids `#input-search-activities`/`#input-search-purchases`
  (Task 4); `data-action="priority|edit|delete"` nos botões dentro de
  `.card-actions` (Task 5).
- Produces: nenhuma (fim da cadeia desta rodada de ajustes).

- [ ] **Step 1: Generalizar `openModal`/`createModalHost`**

Estender `createModalHost()` para incluir, além do que já existe
(`select`, `note`): um `input#modal-description` (texto) e um
`input#modal-value` (texto, para receber `attachMoneyMask` uma única vez
na criação do host) e um `input#modal-quantity` (`type="number"`,
`min="1"`). Todos começam ocultos (`style.display = 'none'`) e
`openModal` passa a aceitar as flags `showDescription`, `showValue`,
`showQuantity` (além das já existentes `showSelect`/`showNote` implícito)
com os respectivos `initialDescription`/`initialValueCents`/`initialQuantity`,
alternando `style.display` de cada campo. O resultado retornado por
`openModal` passa a incluir `description`, `valueCents` (lido do estado de
`attachMoneyMask` do input do modal, mesmo padrão do form de nova compra),
e `quantity` (`Number(input.value) || 1`), junto com o que já existia
(`confirmed`, `select`/`value`, `note`).

- [ ] **Step 2: Wiring de busca**

Duas variáveis de módulo: `activitySearchQuery = ''`,
`purchaseSearchQuery = ''`. Listener `input` em
`#input-search-activities`/`#input-search-purchases` atualiza a variável
correspondente e chama `renderAll()`. Em `renderAll()`, aplicar
`filterByQuery(..., activitySearchQuery)` / `filterByQuery(..., purchaseSearchQuery)`
sobre as listas pendentes/histórico antes de passar para
`renderActivitiesList`/`renderPurchasesList` (mesmo ponto onde hoje já se
filtra por `status`).

- [ ] **Step 3: Wiring de prioridade, editar e excluir nos cards**

Em `wireCardInteractions()`, no topo de cada um dos 4 listeners de clique
já existentes, checar primeiro `event.target.closest('button[data-action]')`:
  - `data-action="priority"`: chamar `toggleActivityPriority`/`togglePurchasePriority`
    no item correspondente, persistir, `renderAll()`, `return` (não abre
    modal, não dispara o fluxo de concluir/status que já existia para o
    clique no corpo do card).
  - `data-action="edit"`: abrir `openModal` em modo edição (atividade:
    `showDescription`+`showNote`, com `initialDescription: activity.description`,
    `initialNote: activity.note`; compra: `showDescription`+`showValue`+`showSelect`
    com `selectOptions: PURCHASE_DESTINATIONS`+`showQuantity`+`showNote`, com
    `initialDescription: purchase.description`, `initialValueCents: purchase.valueCents`,
    `initialSelect: purchase.destino`, `initialQuantity: purchase.quantity ?? 1`,
    `initialNote: purchase.note`); se confirmado, chamar
    `updateActivity`/`updatePurchase`, persistir, `renderAll()`, `return`. Se
    cancelado, não alterar nada no item.
  - `data-action="delete"`: abrir `openModal` em modo só-confirmar (todas
    as flags de campo falsas), título "Excluir este item?"; se
    confirmado, remover do array (`splice`/`filter` por id), persistir,
    `renderAll()`, `return`.
  Se o clique não bateu em nenhum `data-action`, seguir com a lógica já
  existente do listener (concluir/reabrir/mudar status).

- [ ] **Step 4: Verificação manual completa**

Rodar a suíte completa, depois QA manual no navegador cobrindo: buscar
uma atividade por palavra (bate e não bate, inclusive com acento
diferente); marcar/desmarcar prioridade em atividade e compra e ver
reordenar; editar uma atividade (descrição + observação) e uma compra
(descrição + valor + destino + quantidade + observação) e confirmar que
os dados persistem após reload; editar o destino de uma compra com o
agrupamento por destino ativo e confirmar que o card migra para o grupo
novo; cancelar uma edição e confirmar que nada mudou no item; excluir um
item de cada lista (pendente e histórico, atividade e compra) com
confirmação, e cancelar uma exclusão confirmando que nada muda.

Run: `node --test "tests/*.test.js"`
Expected: PASS (suíte completa continua verde)

- [ ] **Step 5: Commit**

```bash
git add js/app.js
git commit -m "feat: wire search, priority toggle, edit and delete actions"
```

---

### Task 7: Atualizar o Service Worker e publicar

**Files:**
- Modify: `sw.js`

**Interfaces:**
- Consumes: nenhuma.
- Produces: nenhuma (fim da cadeia).

**Por quê:** o Service Worker atual é cache-first e só é considerado
"atualizado" pelo navegador quando o **conteúdo do próprio `sw.js`**
muda. Sem isso, o celular do Michael nunca buscaria os arquivos novos
desta rodada (nem de nenhuma rodada futura) — continuaria servindo o
cache antigo para sempre.

- [ ] **Step 1: Bumpar a versão do cache e ativar atualização automática em `sw.js`**

Trocar `CACHE_NAME = 'app-shell-v1'` para `'app-shell-v2'`. No handler de
`install`, adicionar `self.skipWaiting()` depois do `cache.addAll(...)`.
Adicionar um handler de `activate` que apaga caches antigos e assume o
controle imediatamente:

```js
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});
```

- [ ] **Step 2: Verificação manual do ciclo de atualização**

Servir a pasta localmente (`python -m http.server`), abrir no navegador,
confirmar que o Service Worker instala (DevTools → Application →
Service Workers). Simular uma segunda versão (editar um comentário em
`sw.js`, recarregar) e confirmar que o novo SW assume sem exigir
desinstalar o app.

Expected: o novo Service Worker ativa e assume o controle (`clients.claim()`)
sem deixar a aba/app preso na versão antiga.

- [ ] **Step 3: Commit**

```bash
git add sw.js
git commit -m "fix: bump service worker cache version and auto-update on new deploys"
```

- [ ] **Step 4: Enviar os commits para `main`** (`git push origin <branch>:main` —
  mesmo fluxo já usado na primeira publicação; GitHub Pages reconstrói
  automaticamente a partir de `main`).

- [ ] **Step 5: Confirmar que a página publicada atualizou** (`curl -s -o /dev/null -w "%{http_code}\n" https://michaelbarneysilva-cpu.github.io/controle-atividades-mb/` deve retornar 200; se o cache do GitHub Pages ainda não atualizou, aguardar e checar de novo).

- [ ] **Step 6: Pedir para o Michael recarregar o app instalado no celular** (pode levar um recarregamento extra para o novo Service Worker assumir, mas não deve mais exigir reinstalar o app) **e confirmar que os ajustes aparecem e funcionam**: busca, prioridade, editar, excluir, quantidade, e que a tela de Compras não corta mais o botão de salvar nem o menu inferior.

---
