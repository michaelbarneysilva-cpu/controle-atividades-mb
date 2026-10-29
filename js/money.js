const brlFormatter = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 });

export function digitsToCents(digits) {
  if (!digits) {
    return 0;
  }
  return parseInt(digits, 10);
}

export function centsToBRL(cents) {
  return `R$ ${brlFormatter.format(cents / 100)}`;
}

export function appendDigit(currentDigits, digit) {
  return (currentDigits + digit).replace(/^0+(?=\d)/, '');
}

export function backspaceDigit(currentDigits) {
  return currentDigits.slice(0, -1);
}

export function attachMoneyMask(inputEl, onChange) {
  inputEl.dataset.rawDigits = inputEl.dataset.rawDigits || '';

  function render() {
    const digits = inputEl.dataset.rawDigits;
    inputEl.value = centsToBRL(digitsToCents(digits));
    onChange(digitsToCents(digits));
  }

  inputEl.addEventListener('keydown', (event) => {
    if (/^[0-9]$/.test(event.key)) {
      inputEl.dataset.rawDigits = appendDigit(inputEl.dataset.rawDigits, event.key);
      event.preventDefault();
      render();
      return;
    }
    if (event.key === 'Backspace') {
      inputEl.dataset.rawDigits = backspaceDigit(inputEl.dataset.rawDigits);
      event.preventDefault();
      render();
      return;
    }
    event.preventDefault();
  });

  render();
}
