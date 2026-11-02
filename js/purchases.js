export const PURCHASE_DESTINATIONS = {
  michael_pessoal: 'Michael Pessoal',
  michael_casa: 'Michael Casa',
  mae: 'Mãe',
  gravata: 'Gravatá',
  cachorros: 'Cachorros',
  outros: 'Outros',
};

export const PURCHASE_STATUSES = {
  pending: 'Pendente',
  ok: 'Ok!',
  cancelled: 'Cancelado',
};

function sanitizeQuantity(quantity) {
  return Number.isInteger(quantity) && quantity > 0 ? quantity : 1;
}

export function createPurchase(description, destino, valueCents = 0, quantity = 1) {
  if (description.trim() === '' || !(destino in PURCHASE_DESTINATIONS)) {
    return null;
  }
  return {
    id: crypto.randomUUID(),
    description,
    createdAt: new Date().toISOString(),
    status: 'pending',
    closedAt: null,
    destino,
    valueCents,
    quantity: sanitizeQuantity(quantity),
    priority: false,
    note: '',
  };
}

export function togglePurchasePriority(purchase) {
  return { ...purchase, priority: !purchase.priority };
}

export function updatePurchase(purchase, { description, destino, valueCents, quantity, note }) {
  if (description.trim() === '' || !(destino in PURCHASE_DESTINATIONS)) {
    return null;
  }
  return {
    ...purchase,
    description,
    destino,
    valueCents,
    quantity: sanitizeQuantity(quantity),
    note,
  };
}

export function splitByPriority(purchases) {
  return {
    priority: purchases.filter((purchase) => Boolean(purchase.priority)),
    rest: purchases.filter((purchase) => !purchase.priority),
  };
}

export function sortPurchases(purchases) {
  const { priority, rest } = splitByPriority(purchases);
  return [...priority, ...rest];
}

export function setPurchaseStatus(purchase, status, note) {
  if (!(status in PURCHASE_STATUSES)) {
    throw new Error('invalid status');
  }
  return {
    ...purchase,
    status,
    closedAt: status !== 'pending' ? new Date().toISOString() : null,
    note: note ?? purchase.note,
  };
}

export function reopenPurchase(purchase) {
  return setPurchaseStatus(purchase, 'pending');
}

export function updatePurchaseValue(purchase, valueCents) {
  return { ...purchase, valueCents };
}

export function groupByDestino(purchases) {
  const groups = new Map();
  for (const destino of Object.keys(PURCHASE_DESTINATIONS)) {
    const items = purchases.filter((purchase) => purchase.destino === destino);
    if (items.length > 0) {
      groups.set(destino, items);
    }
  }
  return groups;
}
