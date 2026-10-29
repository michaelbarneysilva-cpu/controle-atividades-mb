# Controle de Atividades e Compras — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a zero-cost, installable PWA that lets Michael track daily
activities (pending → completed, with an execution-quality classification
and a note) and shopping items (pending → Ok!/Cancelled, with a BRL value,
a destination tag, and a note), with light/dark theme and no server.

**Architecture:** Vanilla HTML/CSS/JS, no build step, no framework, no npm
dependencies. Domain logic (activities, purchases, money formatting,
settings, storage) lives in small pure-function ES modules, unit-tested
with Node's built-in test runner. A thin `app.js` wires DOM events to
those modules and re-renders. Data persists in `localStorage` as JSON;
an export/import pair gives a manual backup path. Installability comes
from a web app manifest + service worker, deployed on GitHub Pages
(free static HTTPS hosting satisfies PWA install requirements).

**Tech Stack:** HTML5, CSS3 (custom properties for theming), vanilla
JavaScript (ES modules), Node.js built-in test runner (`node --test`,
`node:assert/strict`) for unit tests — no npm packages. GitHub Pages for
hosting/deploy.

**Spec:** `docs/superpowers/specs/2026-10-29-controle-de-atividades-e-compras-design.md`

## Global Constraints

- Custo zero, permanentemente: nenhuma dependência paga (hosting, build, libs).
- Sem servidor: todos os dados residem em `localStorage` no celular do Michael.
- App deve ser instalável via GitHub Pages (HTTPS), funcionando offline via Service Worker.
- Uso por uma única pessoa, sem login/conta.
- Nunca apagar um item sem confirmação explícita do usuário.
- Atividades: campos description, createdAt (auto), completedAt (auto ao concluir), classification (menu, preenchida ao encerrar), note (opcional).
- Classificação de execução (exatamente estes 5 valores/labels): Concluída totalmente, Concluída parcialmente, Executada no mínimo, Remarcada, Não realizada.
- Compras: campos description, valor em R$ (opcional, máscara tipo caixa eletrônico), destino, status, note (opcional).
- Destinos (exatamente estes 6): Michael Pessoal, Michael Casa, Mãe, Gravatá, Cachorros, Outros.
- Status de compra (exatamente estes 3): Ok!, Pendente, Cancelado.
- Compras também têm aba de Histórico (Ok!/Cancelado saem de Pendentes).
- Lista de compras pendentes pode ser agrupada por destino (toggle configurável).
- Itens encerrados (atividades e compras) podem ser reabertos/editados depois.
- Configurações: tema Claro/Escuro, cor de destaque, toggle de agrupar por destino.
- Direção visual aprovada no mockup: cards arredondados, abas Pendentes/Histórico, FAB de adicionar, azul como cor de destaque padrão, nav inferior com 2 itens.

## Review Focus

- **Máscara de valor com entradas extremas** (só um dígito, muitos dígitos, apagar tudo): usuário espera que o valor sempre apareça formatado como `R$ 0,00`, `R$ 0,05`, `R$ 1.234,56`, nunca `NaN` ou negativo.
- **Envio de descrição vazia/só espaços** em atividade ou compra: usuário espera que nada seja criado (sem itens fantasmas na lista).
- **Reabrir um item encerrado**: usuário espera que a data de criação original se mantenha e a data de encerramento/classificação sejam limpas, sem duplicar o item.
- **Configurações não voltam ao padrão depois de recarregar a página**: usuário espera que tema, cor de destaque e toggle de agrupamento persistam entre sessões.
- **Importar um backup JSON inválido ou de outro app**: usuário espera que o app rejeite o arquivo e mantenha os dados atuais intactos, em vez de corromper o que já tinha.

---

## File Structure

```
index.html
manifest.webmanifest
sw.js
package.json                  # { "type": "module" } — só para Node tratar os módulos como ESM nos testes
css/
  styles.css
icons/
  icon-192.png
  icon-512.png
scripts/
  generate-icons.py
js/
  storage.js
  money.js
  activities.js
  purchases.js
  settings.js
  render.js
  app.js
tests/
  storage.test.js
  money.test.js
  activities.test.js
  purchases.test.js
  settings.test.js
```

---

### Task 1: Storage layer (persistência genérica + backup)

**Files:**
- Create: `package.json`
- Create: `js/storage.js`
- Test: `tests/storage.test.js`

**Interfaces:**
- Produces:
  - `makeMemoryEngine(): StorageEngine` — engine fake com `getItem(key)`/`setItem(key,value)`, usada nos testes e disponível para qualquer módulo que precise testar sem `localStorage`.
  - `loadJSON(engine: StorageEngine, key: string, fallback: any): any`
  - `saveJSON(engine: StorageEngine, key: string, value: any): void`
  - `exportBackup(engine: StorageEngine): { version: 1, activities: Activity[], purchases: Purchase[], settings: object }`
  - `importBackup(engine: StorageEngine, backupData: object): void` — lança `Error('invalid backup')` se `backupData.version !== 1` ou se `activities`/`purchases` não forem arrays ou `settings` não for objeto; só então sobrescreve as três chaves.
  - Chaves de armazenamento usadas pelo resto do app (constantes exportadas): `ACTIVITIES_KEY = 'activities-v1'`, `PURCHASES_KEY = 'purchases-v1'`, `SETTINGS_KEY = 'settings-v1'`.

- [ ] **Step 1: Criar `package.json` com `{ "name": "controle-atividades-mb", "type": "module", "private": true }`**

- [ ] **Step 2: Escrever o teste falho para `loadJSON`/`saveJSON`**

```javascript
// tests/storage.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeMemoryEngine, loadJSON, saveJSON } from '../js/storage.js';

test('loadJSON retorna fallback quando a chave não existe', () => {
  const engine = makeMemoryEngine();
  assert.deepEqual(loadJSON(engine, 'foo', []), []);
});

test('saveJSON seguido de loadJSON retorna o mesmo valor', () => {
  const engine = makeMemoryEngine();
  saveJSON(engine, 'foo', [{ a: 1 }]);
  assert.deepEqual(loadJSON(engine, 'foo', []), [{ a: 1 }]);
});
```

- [ ] **Step 3: Rodar e confirmar falha**

Run: `node --test tests/storage.test.js`
Expected: FAIL (`storage.js` ainda não existe)

- [ ] **Step 4: Implementar `makeMemoryEngine`, `loadJSON`, `saveJSON` em `js/storage.js`**

`makeMemoryEngine` guarda um `Map` interno; `loadJSON` faz `JSON.parse` do valor armazenado (ou retorna `fallback` se ausente/inválido); `saveJSON` faz `JSON.stringify` e chama `engine.setItem`.

- [ ] **Step 5: Rodar e confirmar sucesso**

Run: `node --test tests/storage.test.js`
Expected: PASS

- [ ] **Step 6: Escrever os testes falhos de `exportBackup`/`importBackup`, incluindo o caso do Review Focus (import inválido não deve alterar os dados)**

```javascript
import { exportBackup, importBackup, ACTIVITIES_KEY, PURCHASES_KEY, SETTINGS_KEY } from '../js/storage.js';

test('exportBackup junta as três coleções com version 1', () => {
  const engine = makeMemoryEngine();
  saveJSON(engine, ACTIVITIES_KEY, [{ id: '1' }]);
  const backup = exportBackup(engine);
  assert.equal(backup.version, 1);
  assert.deepEqual(backup.activities, [{ id: '1' }]);
});

test('importBackup rejeita payload inválido e preserva os dados atuais', () => {
  const engine = makeMemoryEngine();
  saveJSON(engine, ACTIVITIES_KEY, [{ id: 'original' }]);
  assert.throws(() => importBackup(engine, { version: 2 }), /invalid backup/);
  assert.deepEqual(loadJSON(engine, ACTIVITIES_KEY, []), [{ id: 'original' }]);
});

test('importBackup válido sobrescreve as três coleções', () => {
  const engine = makeMemoryEngine();
  importBackup(engine, { version: 1, activities: [{ id: 'x' }], purchases: [], settings: { theme: 'light' } });
  assert.deepEqual(loadJSON(engine, ACTIVITIES_KEY, []), [{ id: 'x' }]);
});
```

- [ ] **Step 7: Rodar e confirmar falha, depois implementar `exportBackup`/`importBackup` e as constantes de chave em `js/storage.js`**

- [ ] **Step 8: Rodar `node --test tests/storage.test.js` e confirmar PASS**

- [ ] **Step 9: Commit**

```bash
git add package.json js/storage.js tests/storage.test.js
git commit -m "feat: add localStorage-backed storage layer with backup import/export"
```

---

### Task 2: Money mask (formatação de valor em R$)

**Files:**
- Create: `js/money.js`
- Test: `tests/money.test.js`

**Interfaces:**
- Consumes: nada de outras tasks.
- Produces:
  - `digitsToCents(digits: string): number` — string só com dígitos (ex. `"18790"`) → `18790` (centavos). String vazia → `0`.
  - `centsToBRL(cents: number): string` — `0` → `"R$ 0,00"`, `18790` → `"R$ 187,90"`, `123456` → `"R$ 1.234,56"`.
  - `appendDigit(currentDigits: string, digit: string): string` — concatena um dígito novo à direita, cortando zeros à esquerda além do necessário (ex. `appendDigit('0', '5') === '5'`).
  - `backspaceDigit(currentDigits: string): string` — remove o último dígito; string vazia permanece vazia.
  - `attachMoneyMask(inputEl: HTMLInputElement, onChange: (cents: number) => void): void` — wiring de DOM (keydown/input), consumido pela Task 7; não testado via `node --test` (sem DOM), validado manualmente no navegador.

- [ ] **Step 1: Escrever os testes falhos cobrindo os extremos do Review Focus (um dígito, muitos dígitos, string vazia)**

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';
import { digitsToCents, centsToBRL, appendDigit, backspaceDigit } from '../js/money.js';

test('digitsToCents converte string vazia em 0', () => {
  assert.equal(digitsToCents(''), 0);
});

test('centsToBRL formata valores simples e grandes', () => {
  assert.equal(centsToBRL(0), 'R$ 0,00');
  assert.equal(centsToBRL(5), 'R$ 0,05');
  assert.equal(centsToBRL(18790), 'R$ 187,90');
  assert.equal(centsToBRL(123456), 'R$ 1.234,56');
});

test('appendDigit e backspaceDigit nunca geram negativo ou NaN', () => {
  let digits = '';
  digits = appendDigit(digits, '5');
  assert.equal(centsToBRL(digitsToCents(digits)), 'R$ 0,05');
  digits = backspaceDigit(digits);
  assert.equal(digits, '');
  digits = backspaceDigit(digits);
  assert.equal(digits, '');
});
```

- [ ] **Step 2: Rodar e confirmar falha**

Run: `node --test tests/money.test.js`
Expected: FAIL

- [ ] **Step 3: Implementar `digitsToCents`, `centsToBRL`, `appendDigit`, `backspaceDigit` em `js/money.js`**

`centsToBRL` usa `Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 })` sobre `cents/100`.

- [ ] **Step 4: Rodar e confirmar sucesso**

Run: `node --test tests/money.test.js`
Expected: PASS

- [ ] **Step 5: Implementar `attachMoneyMask` em `js/money.js`**

Intercepta `keydown` no input: dígitos chamam `appendDigit`, `Backspace` chama `backspaceDigit`, qualquer outra tecla é ignorada (`preventDefault`); a cada mudança atualiza `inputEl.value = centsToBRL(digitsToCents(digits))` e chama `onChange(digitsToCents(digits))`. Guarda o estado `digits` em `inputEl.dataset.rawDigits`.

- [ ] **Step 6: Commit**

```bash
git add js/money.js tests/money.test.js
git commit -m "feat: add BRL money mask formatting"
```

---

### Task 3: Activities domain logic

**Files:**
- Create: `js/activities.js`
- Test: `tests/activities.test.js`

**Interfaces:**
- Consumes: nenhuma função de outra task (módulo puro, sem I/O).
- Produces:
  - `ACTIVITY_CLASSIFICATIONS: { completed_full: 'Concluída totalmente', completed_partial: 'Concluída parcialmente', minimum_done: 'Executada no mínimo', rescheduled: 'Remarcada', not_done: 'Não realizada' }`
  - `Activity` shape: `{ id: string, description: string, createdAt: string (ISO), status: 'pending' | 'done', completedAt: string | null, classification: string | null, note: string }`
  - `createActivity(description: string): Activity | null` — `null` se `description.trim() === ''`; caso contrário `id` via `crypto.randomUUID()`, `createdAt = new Date().toISOString()`, `status: 'pending'`, `completedAt: null`, `classification: null`, `note: ''`.
  - `completeActivity(activity: Activity, classificationKey: string, note?: string): Activity` — retorna novo objeto com `status: 'done'`, `completedAt = new Date().toISOString()`, `classification: classificationKey`, `note: note ?? activity.note`. Lança `Error('invalid classification')` se `classificationKey` não estiver em `ACTIVITY_CLASSIFICATIONS`.
  - `reopenActivity(activity: Activity): Activity` — retorna novo objeto com `status: 'pending'`, `completedAt: null`, `classification: null` (mantém `createdAt`, `description`, `note`).
  - `updateActivityNote(activity: Activity, note: string): Activity`

- [ ] **Step 1: Escrever os testes falhos, incluindo descrição vazia e o ciclo completar→reabrir do Review Focus**

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';
import { createActivity, completeActivity, reopenActivity, ACTIVITY_CLASSIFICATIONS } from '../js/activities.js';

test('createActivity retorna null para descrição vazia ou só espaços', () => {
  assert.equal(createActivity(''), null);
  assert.equal(createActivity('   '), null);
});

test('createActivity cria item pendente com createdAt preenchido', () => {
  const activity = createActivity('Pagar IPTU');
  assert.equal(activity.status, 'pending');
  assert.equal(activity.classification, null);
  assert.ok(activity.createdAt);
});

test('completeActivity preenche completedAt e classification', () => {
  const activity = createActivity('Revisar contrato');
  const done = completeActivity(activity, 'rescheduled', 'médico cancelou');
  assert.equal(done.status, 'done');
  assert.equal(done.classification, 'rescheduled');
  assert.ok(done.completedAt);
});

test('completeActivity rejeita classificação desconhecida', () => {
  const activity = createActivity('x');
  assert.throws(() => completeActivity(activity, 'bogus'), /invalid classification/);
});

test('reopenActivity limpa completedAt e classification mas preserva createdAt', () => {
  const activity = createActivity('Organizar garagem');
  const done = completeActivity(activity, 'completed_partial', 'faltou ferramenta');
  const reopened = reopenActivity(done);
  assert.equal(reopened.status, 'pending');
  assert.equal(reopened.completedAt, null);
  assert.equal(reopened.classification, null);
  assert.equal(reopened.createdAt, activity.createdAt);
});
```

- [ ] **Step 2: Rodar e confirmar falha**

Run: `node --test tests/activities.test.js`
Expected: FAIL

- [ ] **Step 3: Implementar `ACTIVITY_CLASSIFICATIONS`, `createActivity`, `completeActivity`, `reopenActivity`, `updateActivityNote` em `js/activities.js`**

- [ ] **Step 4: Rodar e confirmar sucesso**

Run: `node --test tests/activities.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add js/activities.js tests/activities.test.js
git commit -m "feat: add activities domain logic"
```

---

### Task 4: Purchases domain logic

**Files:**
- Create: `js/purchases.js`
- Test: `tests/purchases.test.js`

**Interfaces:**
- Consumes: nenhuma função de outra task (módulo puro).
- Produces:
  - `PURCHASE_DESTINATIONS: { michael_pessoal: 'Michael Pessoal', michael_casa: 'Michael Casa', mae: 'Mãe', gravata: 'Gravatá', cachorros: 'Cachorros', outros: 'Outros' }`
  - `PURCHASE_STATUSES: { pending: 'Pendente', ok: 'Ok!', cancelled: 'Cancelado' }`
  - `Purchase` shape: `{ id: string, description: string, createdAt: string, status: 'pending' | 'ok' | 'cancelled', closedAt: string | null, destino: string, valueCents: number, note: string }`
  - `createPurchase(description: string, destino: string, valueCents?: number): Purchase | null` — `null` se `description.trim() === ''` ou `destino` não estiver em `PURCHASE_DESTINATIONS`; `valueCents` default `0`; `status: 'pending'`, `closedAt: null`.
  - `setPurchaseStatus(purchase: Purchase, status: string, note?: string): Purchase` — lança `Error('invalid status')` se `status` não estiver em `PURCHASE_STATUSES`; se `status !== 'pending'` define `closedAt = new Date().toISOString()`, senão `closedAt: null`.
  - `reopenPurchase(purchase: Purchase): Purchase` — equivalente a `setPurchaseStatus(purchase, 'pending')`.
  - `updatePurchaseValue(purchase: Purchase, valueCents: number): Purchase`
  - `groupByDestino(purchases: Purchase[]): Map<string, Purchase[]>` — agrupa mantendo a ordem de `PURCHASE_DESTINATIONS`, omitindo grupos vazios.

- [ ] **Step 1: Escrever os testes falhos, incluindo descrição vazia, valor ausente e o agrupamento**

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';
import { createPurchase, setPurchaseStatus, reopenPurchase, groupByDestino, PURCHASE_DESTINATIONS } from '../js/purchases.js';

test('createPurchase retorna null para descrição vazia', () => {
  assert.equal(createPurchase('', 'outros'), null);
});

test('createPurchase sem valor assume 0 centavos', () => {
  const purchase = createPurchase('Ração premium', 'cachorros');
  assert.equal(purchase.valueCents, 0);
  assert.equal(purchase.status, 'pending');
});

test('setPurchaseStatus para ok preenche closedAt; reopenPurchase limpa', () => {
  const purchase = createPurchase('Coleira', 'cachorros');
  const done = setPurchaseStatus(purchase, 'ok');
  assert.ok(done.closedAt);
  const reopened = reopenPurchase(done);
  assert.equal(reopened.status, 'pending');
  assert.equal(reopened.closedAt, null);
});

test('groupByDestino agrupa só os destinos presentes, na ordem do enum', () => {
  const items = [
    createPurchase('Tênis', 'michael_pessoal'),
    createPurchase('Remédio', 'mae'),
    createPurchase('Ração', 'cachorros'),
  ];
  const groups = groupByDestino(items);
  assert.deepEqual([...groups.keys()], ['michael_pessoal', 'mae', 'cachorros']);
});
```

- [ ] **Step 2: Rodar e confirmar falha**

Run: `node --test tests/purchases.test.js`
Expected: FAIL

- [ ] **Step 3: Implementar `PURCHASE_DESTINATIONS`, `PURCHASE_STATUSES`, `createPurchase`, `setPurchaseStatus`, `reopenPurchase`, `updatePurchaseValue`, `groupByDestino` em `js/purchases.js`**

`groupByDestino` itera `Object.keys(PURCHASE_DESTINATIONS)` e filtra `purchases` por `destino` para preservar a ordem.

- [ ] **Step 4: Rodar e confirmar sucesso**

Run: `node --test tests/purchases.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add js/purchases.js tests/purchases.test.js
git commit -m "feat: add purchases domain logic"
```

---

### Task 5: Settings module

**Files:**
- Create: `js/settings.js`
- Test: `tests/settings.test.js`

**Interfaces:**
- Consumes: `makeMemoryEngine`, `loadJSON`, `saveJSON`, `SETTINGS_KEY` de `js/storage.js` (Task 1).
- Produces:
  - `DEFAULT_SETTINGS: { theme: 'dark', accent: 'blue', groupPurchasesByDestino: true }`
  - `loadSettings(engine: StorageEngine): Settings` — `loadJSON(engine, SETTINGS_KEY, DEFAULT_SETTINGS)` mesclado com `DEFAULT_SETTINGS` (para tolerar settings salvas antes de um novo campo existir).
  - `saveSettings(engine: StorageEngine, patch: Partial<Settings>): Settings` — lê o atual, aplica o patch, salva, retorna o resultado.

- [ ] **Step 1: Escrever o teste falho cobrindo persistência entre "sessões" (duas chamadas a `loadSettings` sobre o mesmo engine) — este é o caso do Review Focus**

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeMemoryEngine } from '../js/storage.js';
import { loadSettings, saveSettings, DEFAULT_SETTINGS } from '../js/settings.js';

test('loadSettings sem dados salvos retorna os defaults', () => {
  const engine = makeMemoryEngine();
  assert.deepEqual(loadSettings(engine), DEFAULT_SETTINGS);
});

test('saveSettings persiste e uma nova chamada a loadSettings reflete a mudança', () => {
  const engine = makeMemoryEngine();
  saveSettings(engine, { theme: 'light' });
  const reloaded = loadSettings(engine);
  assert.equal(reloaded.theme, 'light');
  assert.equal(reloaded.accent, DEFAULT_SETTINGS.accent);
});
```

- [ ] **Step 2: Rodar e confirmar falha**

Run: `node --test tests/settings.test.js`
Expected: FAIL

- [ ] **Step 3: Implementar `DEFAULT_SETTINGS`, `loadSettings`, `saveSettings` em `js/settings.js`**

- [ ] **Step 4: Rodar e confirmar sucesso**

Run: `node --test tests/settings.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add js/settings.js tests/settings.test.js
git commit -m "feat: add settings module with persisted defaults"
```

---

### Task 6: HTML shell + CSS (tema claro/escuro, visual do mockup)

**Files:**
- Create: `index.html`
- Create: `css/styles.css`

**Interfaces:**
- Consumes: nada (ainda não referencia os módulos JS — isso é a Task 7).
- Produces: estrutura DOM com os `id`s que a Task 7 vai consumir:
  - Nav inferior: `#nav-activities`, `#nav-purchases`.
  - Tela de Atividades: `#view-activities`, abas `#tab-activities-pending`, `#tab-activities-history`, listas `#list-activities-pending`, `#list-activities-history`, formulário `#form-new-activity` com input `#input-new-activity`.
  - Tela de Compras: `#view-purchases`, abas `#tab-purchases-pending`, `#tab-purchases-history`, listas `#list-purchases-pending`, `#list-purchases-history`, formulário `#form-new-purchase` com inputs `#input-new-purchase-desc`, `#input-new-purchase-value`, select `#select-new-purchase-destino`.
  - Tela de Configurações: `#view-settings`, controles `#setting-theme-light`, `#setting-theme-dark`, `#setting-accent` (select), `#setting-group-toggle` (checkbox), `#btn-export-backup` (botão), `#btn-import-backup` (botão que aciona) `#input-import-backup` (`<input type="file" accept="application/json" hidden>`).
  - `<html data-theme="dark">` — atributo que a CSS usa para alternar tema (`:root[data-theme="light"]` sobrescreve as variáveis).

- [ ] **Step 1: Criar `css/styles.css` com variáveis de tema (`--bg`, `--bg-elevated`, `--bg-sunken`, `--border`, `--text`, `--text-dim`, `--accent-1`, `--accent-2`) para `:root` (dark, padrão) e `:root[data-theme="light"]`, usando as cores aprovadas no mockup (`.superpowers/brainstorm/.../app-mockup-v2.html`: azul `#2f81f7` → `#58a6ff` no escuro, `#2f81f7` → `#0969da` no claro)**

- [ ] **Step 2: Criar `index.html` com a estrutura de telas, abas, formulários e nav acima, sem `<script>` de lógica ainda (só `<link rel="stylesheet">`)**

- [ ] **Step 3: Abrir `index.html` direto no navegador e confirmar visualmente que bate com o mockup aprovado (cores, cards, abas, nav inferior) nos dois temas, trocando manualmente `data-theme` no devtools**

- [ ] **Step 4: Commit**

```bash
git add index.html css/styles.css
git commit -m "feat: add app shell markup and theme-aware stylesheet"
```

---

### Task 7: Rendering + App wiring

**Files:**
- Create: `js/render.js`
- Create: `js/app.js`
- Modify: `index.html` (adicionar `<script type="module" src="js/app.js"></script>`)

**Interfaces:**
- Consumes:
  - De `js/storage.js` (Task 1): `loadJSON`, `saveJSON`, `exportBackup`, `importBackup`, `ACTIVITIES_KEY`, `PURCHASES_KEY`.
  - De `js/money.js` (Task 2): `attachMoneyMask`.
  - De `js/activities.js` (Task 3): `createActivity`, `completeActivity`, `reopenActivity`, `ACTIVITY_CLASSIFICATIONS`.
  - De `js/purchases.js` (Task 4): `createPurchase`, `setPurchaseStatus`, `reopenPurchase`, `groupByDestino`, `PURCHASE_DESTINATIONS`, `PURCHASE_STATUSES`.
  - De `js/settings.js` (Task 5): `loadSettings`, `saveSettings`.
  - IDs definidos na Task 6.
- Produces (usado só internamente, sem outra task dependendo):
  - `js/render.js`: `renderActivityCard(activity): HTMLElement`, `renderPurchaseCard(purchase): HTMLElement`, `renderActivitiesList(container, activities)`, `renderPurchasesList(container, purchases, { grouped })`.
  - `js/app.js`: função `init()` chamada no carregamento, sem export necessário além disso.

- [ ] **Step 1: Implementar `js/render.js`** — funções puras de DOM que recebem um item e devolvem o elemento do card (badge de status/classificação, descrição, datas, observação), e funções que limpam um container e inserem os cards.

- [ ] **Step 2: Implementar `js/app.js`** — na inicialização: usa `window.localStorage` como engine real; carrega activities/purchases/settings; aplica `data-theme` e cor de destaque no `<html>`; renderiza as 4 listas; liga os formulários (`submit` em `#form-new-activity`/`#form-new-purchase` chamam `createActivity`/`createPurchase`, bloqueando submit vazio porque essas funções retornam `null`); liga clique nos cards para abrir a ação de concluir/mudar status (com os menus de classificação/status/observação) e para reabrir um item do histórico; liga `attachMoneyMask` no `#input-new-purchase-value`; liga as trocas de aba (mostrar/esconder as listas pending/history); liga os controles de `#view-settings` a `saveSettings`, reaplicando tema/accent imediatamente.

- [ ] **Step 2b: Ligar backup em `js/app.js`** — clique em `#btn-export-backup` chama `exportBackup`, serializa com `JSON.stringify` e dispara o download via um link `<a>` temporário (`Blob` + `URL.createObjectURL`), nome de arquivo `backup-controle-atividades-AAAA-MM-DD.json`; clique em `#btn-import-backup` aciona `#input-import-backup.click()`; `change` em `#input-import-backup` lê o arquivo (`FileReader`/`file.text()`), faz `JSON.parse` e chama `importBackup` dentro de um `try/catch` — em caso de erro, mostra um alerta ("Arquivo de backup inválido") e não altera a tela; em caso de sucesso, recarrega as 4 listas e as settings a partir do storage.

- [ ] **Step 3: Adicionar `<script type="module" src="js/app.js"></script>` ao final do `<body>` em `index.html`**

- [ ] **Step 4: Testar manualmente no navegador**: criar uma atividade, concluí-la com cada uma das 5 classificações, reabrir uma; criar uma compra sem valor e uma com valor (digitando no campo e confirmando a máscara), mudar status para Ok!/Cancelado e ver ela mover para Histórico, reabrir uma; alternar tema e cor de destaque em Configurações e recarregar a página para confirmar que persiste; alternar o toggle de agrupar por destino e confirmar que a lista de pendentes agrupa/desagrupa.

- [ ] **Step 5: Commit**

```bash
git add js/render.js js/app.js index.html
git commit -m "feat: wire DOM rendering and app bootstrap to domain modules"
```

---

### Task 8: PWA — manifest, service worker, ícones

**Files:**
- Create: `manifest.webmanifest`
- Create: `sw.js`
- Create: `scripts/generate-icons.py`
- Create: `icons/icon-192.png`, `icons/icon-512.png`
- Modify: `index.html` (adicionar `<link rel="manifest">`, `<meta name="theme-color">`, registro do service worker)

**Interfaces:**
- Consumes: nada de outras tasks (manifest/SW referenciam arquivos estáticos já existentes: `index.html`, `css/styles.css`, os `js/*.js`, os ícones).
- Produces: nada consumido por outra task — é o passo final de instalabilidade.

- [ ] **Step 1: Escrever `scripts/generate-icons.py`** — usa `PIL` (`pip install pillow` se necessário) para gerar `icons/icon-192.png` e `icons/icon-512.png`: fundo com o gradiente/azul sólido `#2f81f7`→`#58a6ff` aproximado por cor sólida `#2f81f7`, cantos vivos (o próprio manifest marca `purpose: maskable` para o SO arredondar), letra "M" branca centralizada usando a fonte default do `PIL.ImageDraw`.

- [ ] **Step 2: Rodar `python scripts/generate-icons.py` e confirmar que os dois arquivos PNG existem com o tamanho certo (abrir com `PIL.Image.open` e checar `.size == (192,192)` / `(512,512)`)**

- [ ] **Step 3: Criar `manifest.webmanifest`** com `name`, `short_name`, `start_url: "."`, `display: "standalone"`, `background_color` e `theme_color` = `#2f81f7`, e os dois ícones (`sizes: "192x192"`/`"512x512"`, `purpose: "any maskable"`).

- [ ] **Step 4: Criar `sw.js`** — `install` faz `caches.open('app-shell-v1')` e `addAll([...todos os arquivos estáticos...])`; `fetch` responde `caches.match(event.request) || fetch(event.request)` (cache-first com fallback de rede).

- [ ] **Step 5: Em `index.html`, adicionar `<link rel="manifest" href="manifest.webmanifest">`, `<meta name="theme-color" content="#2f81f7">`, e em `js/app.js` (ou inline no fim do body) `if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js')`**

- [ ] **Step 6: Testar manualmente**: servir a pasta localmente (`python -m http.server` ou `npx serve`, só para teste — não é a hospedagem final), abrir no Chrome, checar na aba Application que o manifest e o service worker foram aceitos, e que o navegador oferece "instalar app".

- [ ] **Step 7: Commit**

```bash
git add manifest.webmanifest sw.js scripts/generate-icons.py icons/icon-192.png icons/icon-512.png index.html
git commit -m "feat: make app installable as a PWA with offline caching"
```

---

### Task 9: Deploy no GitHub Pages

**Files:**
- Nenhum arquivo de código novo — ação de infraestrutura/deploy.

**Interfaces:** nenhuma (fim da cadeia).

- [ ] **Step 1: Confirmar com o Michael o nome do repositório GitHub antes de criar algo público/visível na conta dele** (ex.: `controle-atividades-mb`), e se o repositório deve ser público (necessário para GitHub Pages grátis em conta free, a menos que já tenha GitHub Pro).

- [ ] **Step 2: Criar o repositório e enviar o código** (`gh repo create <nome> --public --source=. --remote=origin`, depois `git push -u origin main`) — pedir confirmação antes de rodar, por ser uma ação visível na conta do usuário.

- [ ] **Step 3: Ativar GitHub Pages** apontando para a branch `main` (`gh api` ou pelas configurações do repositório) e aguardar o build.

- [ ] **Step 4: Abrir a URL publicada (`https://<usuario>.github.io/<repo>/`) no celular do Michael, confirmar que carrega, e usar "Adicionar à tela inicial" para instalar o PWA de fato**

- [ ] **Step 5: Confirmar com o Michael que o app instalado abre, mostra as telas corretas e funciona com a internet desligada (teste de verdade do Service Worker)**

---

## Self-Review

1. **Cobertura do spec**: Atividades (criar/completar/classificar/observação/reabrir) → Task 3+7. Compras (criar/valor opcional/destino/status/observação/histórico/agrupamento/reabrir) → Task 4+7. Máscara de valor → Task 2. Tema claro/escuro + cor de destaque + toggle de agrupamento → Task 5+6+7. Backup exportar/importar (mencionado no mockup de Configurações) → lógica na Task 1, IDs de UI na Task 6, ligação de fato (botões + download + leitura de arquivo) no Step 2b da Task 7. Instalabilidade/offline → Task 8. Hospedagem → Task 9. Confirmação antes de excluir item — nota: nenhuma task tem uma ação de "excluir" explícita no fluxo (reabrir cobre o caso de engano); se exclusão definitiva for necessária, fica a critério do builder como extensão futura, consistente com o documento de design que não exige exclusão como funcionalidade central.
2. **Steps**: cada step de teste/implementação tem assinatura e valores exatos; nenhum step usa "TBD" ou "tratar casos extras".
3. **Consistência de tipos**: `Activity`/`Purchase` shapes idênticos entre Task 3/4 e o uso em Task 7; chaves de storage (`ACTIVITIES_KEY`/`PURCHASES_KEY`/`SETTINGS_KEY`) definidas uma vez na Task 1 e reusadas nas Tasks 5 e 7.
4. **Review Focus**: as 5 entradas de risco têm teste na task dona (máscara → Task 2 Step 1; descrição vazia → Task 3 Step 1 e Task 4 Step 1; reabrir → Task 3 Step 1 e Task 4 Step 1; persistência de configurações → Task 5 Step 1; import inválido → Task 1 Step 6).
5. **Proporção**: plano tem 9 tasks para um app de duas entidades + settings + PWA; corpo de código nos steps é só assinatura+teste, a implementação fica para quem executa.
