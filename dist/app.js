import { compose } from './hangul.js';

const get = id => document.getElementById(id);
const answer = get('answer');
const keyboard = get('keyboard');
const feedback = get('feedback');
const check = get('check');
const next = get('next');
let pending = null;
let shifted = false;
let current;
let graded = false;
const normalize = value => value.normalize('NFC').trim().replace(/\s+/gu, ' ');

function typeKey(key) {
  if (answer.readOnly) return;
  const start = answer.selectionStart;
  const end = answer.selectionEnd;
  if (!pending || start !== pending.end || end !== start) pending = null;
  if (key === 'Space') {
    answer.setRangeText(' ', start, end, 'end');
    pending = null;
  } else if (key === '⌫' && !pending) {
    answer.setRangeText('', start === end ? Math.max(0, start - 1) : start, end, 'end');
  } else {
    const from = pending?.start ?? start;
    const keys = key === '⌫' ? pending.keys.slice(0, -1) : (pending?.keys ?? '') + key;
    const text = compose(keys);
    answer.setRangeText(text, from, end, 'end');
    pending = keys ? {start:from, end:from + text.length, keys} : null;
  }
  answer.focus();
}

function drawKeyboard() {
  const rows = shifted ? ['ㅃㅉㄸㄲㅆㅛㅕㅑㅒㅖ','ㅁㄴㅇㄹㅎㅗㅓㅏㅣ','ㅋㅌㅊㅍㅠㅜㅡ'] : ['ㅂㅈㄷㄱㅅㅛㅕㅑㅐㅔ','ㅁㄴㅇㄹㅎㅗㅓㅏㅣ','ㅋㅌㅊㅍㅠㅜㅡ'];
  keyboard.replaceChildren();
  for (const keys of [...rows.map(row => [...row]), ['Shift','Space','⌫']]) {
    const row = document.createElement('div');
    row.className = 'key-row';
    for (const key of keys) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = key;
      if (key === '⌫') button.setAttribute('aria-label', 'Backspace');
      if (key === 'Shift') button.setAttribute('aria-pressed', shifted);
      button.addEventListener('pointerdown', event => event.preventDefault());
      button.addEventListener('click', () => {
        if (key === 'Shift') {
          shifted = !shifted;
          drawKeyboard();
          keyboard.querySelector('[aria-pressed]').focus();
        } else {
          typeKey(key);
        }
      });
      row.append(button);
    }
    keyboard.append(row);
  }
}

function setup({forms, entries}) {
  const host = get('forms');
  const pairs = entries.flatMap(entry => Object.keys(forms).filter(form => entry[form]?.length).map(form => ({entry, form})));
  const selected = new Set(Object.keys(forms));
  let deck = [];
  function newQuestion(focus = false) {
    if (!deck.length) {
      deck = pairs.filter(pair => selected.has(pair.form));
      for (let index = deck.length - 1; index > 0; index--) {
        const other = Math.floor(Math.random() * (index + 1));
        [deck[index], deck[other]] = [deck[other], deck[index]];
      }
      if (deck.length > 1 && deck.at(-1) === current) [deck[0], deck[deck.length - 1]] = [deck.at(-1), deck[0]];
    }
    current = deck.pop();
    const {entry, form} = current;
    get('word').textContent = entry.word;
    get('kind').textContent = entry.kind;
    get('meaning').textContent = entry.meaning;
    get('target').textContent = forms[form].label;
    feedback.textContent = '';
    delete feedback.dataset.result;
    answer.value = '';
    answer.readOnly = false;
    pending = null;
    graded = false;
    check.disabled = false;
    next.textContent = 'Skip';
    next.classList.remove('ready');
    if (focus) answer.focus();
  }
  for (const [form, {label}] of Object.entries(forms)) {
    const wrapper = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = true;
    input.addEventListener('change', () => {
      if (input.checked) selected.add(form);
      else selected.delete(form);
      for (const item of host.querySelectorAll('input')) item.disabled = item.checked && selected.size === 1;
      deck = [];
      if (!selected.has(current.form)) newQuestion();
    });
    wrapper.append(input, label);
    host.append(wrapper);
  }
  get('practice').addEventListener('submit', event => {
    event.preventDefault();
    if (graded || !normalize(answer.value)) return;
    const answers = current.entry[current.form];
    const correct = answers.some(value => normalize(value) === normalize(answer.value));
    feedback.dataset.result = correct ? 'correct' : 'wrong';
    const expected = document.createElement('span');
    expected.lang = 'ko';
    expected.textContent = answers.join(' / ');
    feedback.replaceChildren(correct ? 'Correct!' : 'Accepted answers · ');
    if (!correct) feedback.append(expected);
    graded = true;
    answer.readOnly = true;
    check.disabled = true;
    next.textContent = 'Next question';
    next.classList.add('ready');
    next.focus();
  });
  next.addEventListener('click', () => newQuestion(true));
  answer.addEventListener('input', () => { pending = null; });
  answer.addEventListener('pointerdown', () => { pending = null; });
  get('toggle').addEventListener('click', () => {
    keyboard.hidden = !keyboard.hidden;
    get('toggle').setAttribute('aria-expanded', String(!keyboard.hidden));
    get('toggle').textContent = keyboard.hidden ? 'Show Korean keyboard' : 'Hide Korean keyboard';
  });
  drawKeyboard();
  newQuestion();
}
try {
  const response = await fetch('dictionary.json');
  if (!response.ok) throw new Error('Dictionary unavailable');
  setup(await response.json());
} catch {
  get('error').textContent = 'The dictionary could not be loaded. Please reload the page.';
  get('practice').hidden = true;
}
