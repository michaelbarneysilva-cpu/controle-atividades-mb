import { ACTIVITY_CLASSIFICATIONS } from './activities.js';
import { PURCHASE_DESTINATIONS, PURCHASE_STATUSES, groupByDestino } from './purchases.js';
import { centsToBRL } from './money.js';

const CLASSIFICATION_BADGE_CLASS = {
  completed_full: 'badge-ok',
  completed_partial: 'badge-partial',
  minimum_done: 'badge-partial',
  rescheduled: 'badge-reschedule',
  not_done: 'badge-cancel',
};

const PURCHASE_STATUS_BADGE_CLASS = {
  pending: 'badge-pending',
  ok: 'badge-ok',
  cancelled: 'badge-cancel',
};

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('pt-BR');
}

export function renderActivityCard(activity) {
  const card = document.createElement('div');
  card.className = 'card';
  card.dataset.id = activity.id;

  const title = document.createElement('div');
  title.className = 'card-title';
  title.textContent = activity.description;
  card.appendChild(title);

  const meta = document.createElement('div');
  meta.className = 'card-meta';

  const badge = document.createElement('span');
  if (activity.status === 'pending') {
    badge.className = 'badge badge-pending';
    badge.textContent = 'Pendente';
    meta.appendChild(badge);
    meta.appendChild(document.createTextNode(`criada ${formatDate(activity.createdAt)}`));
  } else {
    badge.className = `badge ${CLASSIFICATION_BADGE_CLASS[activity.classification]}`;
    badge.textContent = ACTIVITY_CLASSIFICATIONS[activity.classification];
    meta.appendChild(badge);
    meta.appendChild(
      document.createTextNode(`criada ${formatDate(activity.createdAt)} → concluída ${formatDate(activity.completedAt)}`)
    );
  }
  card.appendChild(meta);

  if (activity.note) {
    const obs = document.createElement('div');
    obs.className = 'obs';
    obs.textContent = `obs: ${activity.note}`;
    card.appendChild(obs);
  }

  return card;
}

export function renderPurchaseCard(purchase) {
  const card = document.createElement('div');
  card.className = 'card';
  card.dataset.id = purchase.id;

  const title = document.createElement('div');
  title.className = 'card-title';
  title.textContent = purchase.description;
  card.appendChild(title);

  const meta = document.createElement('div');
  meta.className = 'card-meta';

  const badge = document.createElement('span');
  badge.className = `badge ${PURCHASE_STATUS_BADGE_CLASS[purchase.status]}`;
  badge.textContent = PURCHASE_STATUSES[purchase.status];
  meta.appendChild(badge);
  meta.appendChild(document.createTextNode(PURCHASE_DESTINATIONS[purchase.destino]));
  meta.appendChild(document.createTextNode(centsToBRL(purchase.valueCents)));
  card.appendChild(meta);

  if (purchase.note) {
    const obs = document.createElement('div');
    obs.className = 'obs';
    obs.textContent = `obs: ${purchase.note}`;
    card.appendChild(obs);
  }

  return card;
}

function renderEmptyHint(container, text) {
  const hint = document.createElement('div');
  hint.className = 'obs';
  hint.textContent = text;
  container.appendChild(hint);
}

export function renderActivitiesList(container, activities) {
  container.innerHTML = '';
  if (activities.length === 0) {
    renderEmptyHint(container, 'Nada por aqui.');
    return;
  }
  for (const activity of activities) {
    container.appendChild(renderActivityCard(activity));
  }
}

export function renderPurchasesList(container, purchases, { grouped } = {}) {
  container.innerHTML = '';
  if (purchases.length === 0) {
    renderEmptyHint(container, 'Nada por aqui.');
    return;
  }

  if (!grouped) {
    for (const purchase of purchases) {
      container.appendChild(renderPurchaseCard(purchase));
    }
    return;
  }

  for (const [destino, items] of groupByDestino(purchases)) {
    const header = document.createElement('div');
    header.className = 'group-header';
    header.textContent = PURCHASE_DESTINATIONS[destino];
    container.appendChild(header);
    for (const purchase of items) {
      container.appendChild(renderPurchaseCard(purchase));
    }
  }
}
