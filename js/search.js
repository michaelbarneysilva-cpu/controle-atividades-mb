function normalize(text) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function matchesQuery(item, query) {
  if (!query) {
    return true;
  }
  const haystack = normalize(`${item.description} ${item.note || ''}`);
  return haystack.includes(normalize(query));
}

export function filterByQuery(items, query) {
  return items.filter((item) => matchesQuery(item, query));
}
