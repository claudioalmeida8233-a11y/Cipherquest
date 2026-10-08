import { encryptCaesar } from './crypto.js';

const EXAMPLES = [
  { original: 'ESCOLA', shift: 3 },
  { original: 'BRUNO', shift: 1 },
  { original: 'CASA', shift: 2 },
  { original: 'CODIGO', shift: -1 }
];
const MAX_REVEALED_LETTERS = 3;

export function maskedReveal(text, revealedCount) {
  let remaining = Math.min(MAX_REVEALED_LETTERS, Math.max(0, Math.floor(revealedCount)));
  return [...text].map(letter => {
    if (letter === ' ') return ' ';
    if (remaining > 0) { remaining -= 1; return letter; }
    return '*';
  }).join('');
}

export function startHeroAnimation() {
  const home = document.getElementById('home');
  const originalElement = document.getElementById('hero-original');
  const resultElement = document.getElementById('hero-result');
  const shiftElement = document.getElementById('hero-shift');
  const mappingElement = document.getElementById('hero-mapping');
  const transmissionElement = document.getElementById('hero-transmission');
  let index = 0;
  let revealTimer;

  function showExample() {
    const { original, shift } = EXAMPLES[index];
    const encrypted = encryptCaesar(original, shift);
    originalElement.textContent = original;
    shiftElement.textContent = shift < 0 ? 'REVERSO −1' : `DESLOCAMENTO +${shift}`;
    transmissionElement.textContent = `TRANSMISSÃO / ${String(index + 1).padStart(3, '0')}`;
    mappingElement.textContent = `${original[0]} → ${encrypted[0]}   ${original[1]} → ${encrypted[1]}`;
    resultElement.textContent = maskedReveal(encrypted, 0);
    clearInterval(revealTimer);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      resultElement.textContent = maskedReveal(encrypted, MAX_REVEALED_LETTERS);
      return;
    }
    let revealed = 0;
    revealTimer = setInterval(() => {
      revealed += 1;
      resultElement.textContent = maskedReveal(encrypted, revealed);
      if (revealed >= MAX_REVEALED_LETTERS) clearInterval(revealTimer);
    }, 420);
  }

  showExample();
  setInterval(() => {
    if (home.hidden) return;
    index = (index + 1) % EXAMPLES.length;
    showExample();
  }, 4400);
}
