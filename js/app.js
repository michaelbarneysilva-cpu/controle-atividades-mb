import { loadJSON, saveJSON, exportBackup, importBackup, ACTIVITIES_KEY, PURCHASES_KEY } from './storage.js';
import { attachMoneyMask, centsToBRL } from './money.js';
import {
  createActivity,
  completeActivity,
  reopenActivity,
  toggleActivityPriority,
  updateActivity,
  ACTIVITY_CLASSIFICATIONS,
} from './activities.js';
import {
  createPurchase,
  setPurchaseStatus,
  reopenPurchase,
  togglePurchasePriority,
  updatePurchase,
  PURCHASE_DESTINATIONS,
  PURCHASE_STATUSES,
} from './purchases.js';
import { loadSettings, saveSettings } from './settings.js';
import { renderActivitiesList, renderPurchasesList } from './render.js';
import { filterByQuery } from './search.js';

const engine = window.localStorage;

let activities = [];
let purchases = [];
let settings = {};
let newPurchaseValueCents = 0;
let activitySearchQuery = '';
let purchaseSearchQuery = '';

const PURCHASE_CLOSE_STATUSES = Object.fromEntries(
  Object.entries(PURCHASE_STATUSES).filter(([key]) => key !== 'pending')
);

function loadAll() {
  activities = loadJSON(engine, ACTIVITIES_KEY, []);
  purchases = loadJSON(engine, PURCHASES_KEY, []);
  settings = loadSettings(engine);
}

function persistActivities() {
  saveJSON(engine, ACTIVITIES_KEY, activities);
}

function persistPurchases() {
  saveJSON(engine, PURCHASES_KEY, purchases);
}

function renderAll() {
  const pendingActivities = filterByQuery(activities.filter((a) => a.status === 'pending'), activitySearchQuery);
  const doneActivities = filterByQuery(activities.filter((a) => a.status === 'done'), activitySearchQuery);
  renderActivitiesList(document.getElementById('list-activities-pending'), pendingActivities);
  renderActivitiesList(document.getElementById('list-activities-history'), doneActivities);

  const pendingPurchases = filterByQuery(purchases.filter((p) => p.status === 'pending'), purchaseSearchQuery);
  const historyPurchases = filterByQuery(purchases.filter((p) => p.status !== 'pending'), purchaseSearchQuery);
  renderPurchasesList(document.getElementById('list-purchases-pending'), pendingPurchases, {
    grouped: settings.groupPurchasesByDestino,
  });
  renderPurchasesList(document.getElementById('list-purchases-history'), historyPurchases, { grouped: false });
}

function applySettingsToDOM() {
  document.documentElement.setAttribute('data-theme', settings.theme);
  document.documentElement.dataset.accent = settings.accent;
  document.getElementById('setting-theme-light').classList.toggle('seg--active', settings.theme === 'light');
  document.getElementById('setting-theme-dark').classList.toggle('seg--active', settings.theme === 'dark');
  document.getElementById('setting-accent').value = settings.accent;
  document.getElementById('setting-group-toggle').checked = settings.groupPurchasesByDestino;
}

function wireNav() {
  const navToView = {
    'nav-activities': 'view-activities',
    'nav-purchases': 'view-purchases',
    'nav-settings': 'view-settings',
  };
  for (const [navId, viewId] of Object.entries(navToView)) {
    document.getElementById(navId).addEventListener('click', () => {
      for (const vId of Object.values(navToView)) {
        document.getElementById(vId).classList.toggle('view--active', vId === viewId);
      }
      for (const nId of Object.keys(navToView)) {
        document.getElementById(nId).classList.toggle('navitem--active', nId === navId);
      }
    });
  }
}

function wireTabs(tabPendingId, tabHistoryId, listPendingId, listHistoryId) {
  const tabPending = document.getElementById(tabPendingId);
  const tabHistory = document.getElementById(tabHistoryId);
  const listPending = document.getElementById(listPendingId);
  const listHistory = document.getElementById(listHistoryId);

  tabPending.addEventListener('click', () => {
    tabPending.classList.add('tab--active');
    tabHistory.classList.remove('tab--active');
    listPending.classList.add('list--active');
    listHistory.classList.remove('list--active');
  });
  tabHistory.addEventListener('click', () => {
    tabHistory.classList.add('tab--active');
    tabPending.classList.remove('tab--active');
    listHistory.classList.add('list--active');
    listPending.classList.remove('list--active');
  });
}

function resetMoneyInput(inputEl) {
  inputEl.dataset.rawDigits = '';
  inputEl.value = 'R$ 0,00';
  newPurchaseValueCents = 0;
}

function wireForms() {
  document.getElementById('form-new-activity').addEventListener('submit', (event) => {
    event.preventDefault();
    const input = document.getElementById('input-new-activity');
    const activity = createActivity(input.value);
    if (!activity) {
      return;
    }
    activities.push(activity);
    persistActivities();
    input.value = '';
    renderAll();
  });

  const valueInput = document.getElementById('input-new-purchase-value');
  attachMoneyMask(valueInput, (cents) => {
    newPurchaseValueCents = cents;
  });

  document.getElementById('form-new-purchase').addEventListener('submit', (event) => {
    event.preventDefault();
    const descInput = document.getElementById('input-new-purchase-desc');
    const destinoSelect = document.getElementById('select-new-purchase-destino');
    const purchase = createPurchase(descInput.value, destinoSelect.value, newPurchaseValueCents);
    if (!purchase) {
      return;
    }
    purchases.push(purchase);
    persistPurchases();
    descInput.value = '';
    resetMoneyInput(valueInput);
    renderAll();
  });
}

function wireSearch() {
  document.getElementById('input-search-activities').addEventListener('input', (event) => {
    activitySearchQuery = event.target.value;
    renderAll();
  });
  document.getElementById('input-search-purchases').addEventListener('input', (event) => {
    purchaseSearchQuery = event.target.value;
    renderAll();
  });
}

function wireSettings() {
  document.getElementById('setting-theme-light').addEventListener('click', () => {
    settings = saveSettings(engine, { theme: 'light' });
    applySettingsToDOM();
  });
  document.getElementById('setting-theme-dark').addEventListener('click', () => {
    settings = saveSettings(engine, { theme: 'dark' });
    applySettingsToDOM();
  });
  document.getElementById('setting-accent').addEventListener('change', (event) => {
    settings = saveSettings(engine, { accent: event.target.value });
    applySettingsToDOM();
  });
  document.getElementById('setting-group-toggle').addEventListener('change', (event) => {
    settings = saveSettings(engine, { groupPurchasesByDestino: event.target.checked });
    renderAll();
  });
}

function wireBackup() {
  document.getElementById('btn-export-backup').addEventListener('click', () => {
    const backup = exportBackup(engine);
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const today = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `backup-controle-atividades-${today}.json`;
    link.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById('btn-import-backup').addEventListener('click', () => {
    document.getElementById('input-import-backup').click();
  });

  document.getElementById('input-import-backup').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) {
      return;
    }
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      importBackup(engine, data);
      loadAll();
      applySettingsToDOM();
      renderAll();
    } catch {
      alert('Arquivo de backup inválido');
    }
    event.target.value = '';
  });
}

let modalEls = null;
let modalValueCents = 0;

function createModalHost() {
  const overlay = document.createElement('div');
  overlay.id = 'action-modal-overlay';
  overlay.className = 'modal-overlay hidden';
  overlay.innerHTML = `
    <div class="modal-box">
      <h3 id="modal-title"></h3>
      <input id="modal-description" type="text" placeholder="Descrição">
      <input id="modal-value" type="text">
      <select id="modal-select"></select>
      <input id="modal-quantity" type="number" min="1">
      <input id="modal-note" type="text" placeholder="Observação (opcional)">
      <div class="modal-actions">
        <button id="modal-cancel" type="button">Cancelar</button>
        <button id="modal-confirm" type="button">Confirmar</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  const description = overlay.querySelector('#modal-description');
  const value = overlay.querySelector('#modal-value');
  const select = overlay.querySelector('#modal-select');
  const quantity = overlay.querySelector('#modal-quantity');
  const note = overlay.querySelector('#modal-note');

  description.style.display = 'none';
  value.style.display = 'none';
  select.style.display = 'none';
  quantity.style.display = 'none';
  note.style.display = 'none';

  attachMoneyMask(value, (cents) => {
    modalValueCents = cents;
  });

  return {
    overlay,
    title: overlay.querySelector('#modal-title'),
    description,
    value,
    select,
    quantity,
    note,
    cancelBtn: overlay.querySelector('#modal-cancel'),
    confirmBtn: overlay.querySelector('#modal-confirm'),
  };
}

function openModal({
  title,
  showDescription,
  initialDescription,
  showValue,
  initialValueCents,
  showSelect,
  selectOptions,
  initialSelect,
  showQuantity,
  initialQuantity,
  showNote = true,
  initialNote,
  confirmLabel,
}) {
  if (!modalEls) {
    modalEls = createModalHost();
  }
  const { overlay, title: titleEl, description, value, select, quantity, note, cancelBtn, confirmBtn } = modalEls;

  titleEl.textContent = title;

  description.style.display = showDescription ? '' : 'none';
  description.value = initialDescription || '';

  value.style.display = showValue ? '' : 'none';
  value.dataset.rawDigits = String(initialValueCents || 0);
  value.value = centsToBRL(initialValueCents || 0);
  modalValueCents = initialValueCents || 0;

  select.style.display = showSelect ? '' : 'none';
  select.innerHTML = '';
  if (showSelect) {
    for (const [key, label] of Object.entries(selectOptions)) {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = label;
      select.appendChild(option);
    }
    if (initialSelect) {
      select.value = initialSelect;
    }
  }

  quantity.style.display = showQuantity ? '' : 'none';
  quantity.value = initialQuantity != null ? initialQuantity : 1;

  note.style.display = showNote ? '' : 'none';
  note.value = initialNote || '';
  confirmBtn.textContent = confirmLabel;
  overlay.classList.remove('hidden');

  return new Promise((resolve) => {
    function cleanup(result) {
      overlay.classList.add('hidden');
      confirmBtn.removeEventListener('click', onConfirm);
      cancelBtn.removeEventListener('click', onCancel);
      resolve(result);
    }
    function onConfirm() {
      cleanup({
        confirmed: true,
        description: description.value,
        valueCents: modalValueCents,
        value: showSelect ? select.value : null,
        quantity: Number(quantity.value) || 1,
        note: note.value,
      });
    }
    function onCancel() {
      cleanup({ confirmed: false });
    }
    confirmBtn.addEventListener('click', onConfirm);
    cancelBtn.addEventListener('click', onCancel);
  });
}

async function handleActivityEdit(activity) {
  const result = await openModal({
    title: 'Editar atividade',
    showDescription: true,
    initialDescription: activity.description,
    initialNote: activity.note,
    confirmLabel: 'Salvar',
  });
  if (!result.confirmed) {
    return;
  }
  const updated = updateActivity(activity, { description: result.description, note: result.note });
  if (!updated) {
    return;
  }
  const index = activities.findIndex((a) => a.id === activity.id);
  activities[index] = updated;
  persistActivities();
  renderAll();
}

async function handleActivityDelete(activity) {
  const result = await openModal({
    title: 'Excluir este item?',
    showNote: false,
    confirmLabel: 'Excluir',
  });
  if (!result.confirmed) {
    return;
  }
  activities = activities.filter((a) => a.id !== activity.id);
  persistActivities();
  renderAll();
}

async function handlePurchaseEdit(purchase) {
  const result = await openModal({
    title: 'Editar compra',
    showDescription: true,
    initialDescription: purchase.description,
    showValue: true,
    initialValueCents: purchase.valueCents,
    showSelect: true,
    selectOptions: PURCHASE_DESTINATIONS,
    initialSelect: purchase.destino,
    showQuantity: true,
    initialQuantity: purchase.quantity ?? 1,
    initialNote: purchase.note,
    confirmLabel: 'Salvar',
  });
  if (!result.confirmed) {
    return;
  }
  const updated = updatePurchase(purchase, {
    description: result.description,
    destino: result.value,
    valueCents: result.valueCents,
    quantity: result.quantity,
    note: result.note,
  });
  if (!updated) {
    return;
  }
  const index = purchases.findIndex((p) => p.id === purchase.id);
  purchases[index] = updated;
  persistPurchases();
  renderAll();
}

async function handlePurchaseDelete(purchase) {
  const result = await openModal({
    title: 'Excluir este item?',
    showNote: false,
    confirmLabel: 'Excluir',
  });
  if (!result.confirmed) {
    return;
  }
  purchases = purchases.filter((p) => p.id !== purchase.id);
  persistPurchases();
  renderAll();
}

function wireCardInteractions() {
  document.getElementById('list-activities-pending').addEventListener('click', async (event) => {
    const card = event.target.closest('.card');
    if (!card) {
      return;
    }
    const activity = activities.find((a) => a.id === card.dataset.id);
    if (!activity) {
      return;
    }

    const actionBtn = event.target.closest('button[data-action]');
    if (actionBtn) {
      if (actionBtn.dataset.action === 'priority') {
        const index = activities.findIndex((a) => a.id === activity.id);
        activities[index] = toggleActivityPriority(activity);
        persistActivities();
        renderAll();
        return;
      }
      if (actionBtn.dataset.action === 'edit') {
        await handleActivityEdit(activity);
        return;
      }
      if (actionBtn.dataset.action === 'delete') {
        await handleActivityDelete(activity);
        return;
      }
      return;
    }

    const result = await openModal({
      title: 'Concluir atividade',
      showSelect: true,
      selectOptions: ACTIVITY_CLASSIFICATIONS,
      initialNote: activity.note,
      confirmLabel: 'Concluir',
    });
    if (!result.confirmed) {
      return;
    }
    const index = activities.findIndex((a) => a.id === activity.id);
    activities[index] = completeActivity(activity, result.value, result.note);
    persistActivities();
    renderAll();
  });

  document.getElementById('list-activities-history').addEventListener('click', async (event) => {
    const card = event.target.closest('.card');
    if (!card) {
      return;
    }
    const activity = activities.find((a) => a.id === card.dataset.id);
    if (!activity) {
      return;
    }

    const actionBtn = event.target.closest('button[data-action]');
    if (actionBtn) {
      if (actionBtn.dataset.action === 'priority') {
        const index = activities.findIndex((a) => a.id === activity.id);
        activities[index] = toggleActivityPriority(activity);
        persistActivities();
        renderAll();
        return;
      }
      if (actionBtn.dataset.action === 'edit') {
        await handleActivityEdit(activity);
        return;
      }
      if (actionBtn.dataset.action === 'delete') {
        await handleActivityDelete(activity);
        return;
      }
      return;
    }

    const result = await openModal({
      title: 'Reabrir esta atividade?',
      showSelect: false,
      initialNote: '',
      confirmLabel: 'Reabrir',
    });
    if (!result.confirmed) {
      return;
    }
    const index = activities.findIndex((a) => a.id === activity.id);
    activities[index] = reopenActivity(activity);
    persistActivities();
    renderAll();
  });

  document.getElementById('list-purchases-pending').addEventListener('click', async (event) => {
    const card = event.target.closest('.card');
    if (!card) {
      return;
    }
    const purchase = purchases.find((p) => p.id === card.dataset.id);
    if (!purchase) {
      return;
    }

    const actionBtn = event.target.closest('button[data-action]');
    if (actionBtn) {
      if (actionBtn.dataset.action === 'priority') {
        const index = purchases.findIndex((p) => p.id === purchase.id);
        purchases[index] = togglePurchasePriority(purchase);
        persistPurchases();
        renderAll();
        return;
      }
      if (actionBtn.dataset.action === 'edit') {
        await handlePurchaseEdit(purchase);
        return;
      }
      if (actionBtn.dataset.action === 'delete') {
        await handlePurchaseDelete(purchase);
        return;
      }
      return;
    }

    const result = await openModal({
      title: 'Mudar status da compra',
      showSelect: true,
      selectOptions: PURCHASE_CLOSE_STATUSES,
      initialNote: purchase.note,
      confirmLabel: 'Confirmar',
    });
    if (!result.confirmed) {
      return;
    }
    const index = purchases.findIndex((p) => p.id === purchase.id);
    purchases[index] = setPurchaseStatus(purchase, result.value, result.note);
    persistPurchases();
    renderAll();
  });

  document.getElementById('list-purchases-history').addEventListener('click', async (event) => {
    const card = event.target.closest('.card');
    if (!card) {
      return;
    }
    const purchase = purchases.find((p) => p.id === card.dataset.id);
    if (!purchase) {
      return;
    }

    const actionBtn = event.target.closest('button[data-action]');
    if (actionBtn) {
      if (actionBtn.dataset.action === 'priority') {
        const index = purchases.findIndex((p) => p.id === purchase.id);
        purchases[index] = togglePurchasePriority(purchase);
        persistPurchases();
        renderAll();
        return;
      }
      if (actionBtn.dataset.action === 'edit') {
        await handlePurchaseEdit(purchase);
        return;
      }
      if (actionBtn.dataset.action === 'delete') {
        await handlePurchaseDelete(purchase);
        return;
      }
      return;
    }

    const result = await openModal({
      title: 'Reabrir esta compra?',
      showSelect: false,
      initialNote: '',
      confirmLabel: 'Reabrir',
    });
    if (!result.confirmed) {
      return;
    }
    const index = purchases.findIndex((p) => p.id === purchase.id);
    purchases[index] = reopenPurchase(purchase);
    persistPurchases();
    renderAll();
  });
}

export function init() {
  loadAll();
  applySettingsToDOM();
  wireNav();
  wireTabs('tab-activities-pending', 'tab-activities-history', 'list-activities-pending', 'list-activities-history');
  wireTabs('tab-purchases-pending', 'tab-purchases-history', 'list-purchases-pending', 'list-purchases-history');
  wireForms();
  wireCardInteractions();
  wireSearch();
  wireSettings();
  wireBackup();
  renderAll();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js');
  }
}

init();
