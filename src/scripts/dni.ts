// Campo de DNI de 8 casillas (avance automático, pegado y borrado).
export function initDni(form: HTMLFormElement) {
  const boxes = [...form.querySelectorAll<HTMLInputElement>('.dni-box')];
  const fill = (from: number, digits: string) => {
    digits.split('').forEach((d, k) => { if (boxes[from + k]) boxes[from + k].value = d; });
    boxes[Math.min(from + digits.length, boxes.length - 1)].focus();
  };
  boxes.forEach((box, i) => {
    box.addEventListener('input', () => { const digits = box.value.replace(/\D/g, ''); box.value = ''; if (digits) fill(i, digits); });
    box.addEventListener('keydown', e => {
      if (e.key === 'Backspace' && !box.value && i > 0) { boxes[i - 1].value = ''; boxes[i - 1].focus(); e.preventDefault(); }
      if (e.key === 'ArrowLeft' && i > 0) boxes[i - 1].focus();
      if (e.key === 'ArrowRight' && i < boxes.length - 1) boxes[i + 1].focus();
    });
    box.addEventListener('paste', e => { e.preventDefault(); fill(i, (e.clipboardData?.getData('text') || '').replace(/\D/g, '').slice(0, boxes.length - i)); });
    box.addEventListener('focus', () => box.select());
  });
}
export function readDni(form: HTMLFormElement): string | null {
  const v = [...form.querySelectorAll<HTMLInputElement>('.dni-box')].map(b => b.value).join('');
  return /^\d{8}$/.test(v) ? v : null;
}
