function normalize(text) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function matchesQuery(item, query) {
  const trimmed = (query || '').trim();
  if (!trimmed) {
    return true;
  }
  const haystack = normalize(`${item.description} ${item.note || ''}`);
  return haystack.includes(normalize(trimmed));
}

export function filterByQuery(items, query) {
  return items.filter((item) => matchesQuery(item, query));
}
