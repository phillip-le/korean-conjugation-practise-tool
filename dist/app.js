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

function explain(entry, form) {
  const note = entry.explanations?.[form];
  if (note) return note;

  const stem = entry.word.slice(0, -1);
  const introduction = `Drop 다 to get the stem ${stem}. `;
  switch (form) {
    case 'present':
      return introduction + 'Add -아요 after ㅏ or ㅗ and -어요 after other vowels. 하다 becomes 해요.';
    case 'past':
      return introduction + 'Add -았어요 after ㅏ or ㅗ and -었어요 after other vowels. 하다 becomes 했어요.';
    case 'negative':
      return introduction + `Add -지 않아요, or put 안 before the polite present form ${entry.present[0]}.`;
    case 'future': {
      const finalConsonant = (stem.charCodeAt(stem.length - 1) - 0xac00) % 28;
      const rule = finalConsonant === 0 ? 'Attach ㄹ to the final syllable, then add a space and 거예요.'
        : finalConsonant === 8 ? 'The stem already ends in ㄹ, so add a space and 거예요.'
        : 'The stem ends in a consonant, so add -을 거예요.';
      return introduction + rule;
    }
    case 'ongoing':
      return introduction + 'Attach -고 directly to the stem, then add a space and 있어요.';
    case 'desire':
      return introduction + 'Attach -고 directly to the stem, then add a space and 싶어요.';
    case 'negativeDesire':
      return introduction + 'Attach -고 directly to the stem, then add a space and 싶지 않아요. The -지 않아요 part negates 싶다.';
    default:
      return '';
  }
}

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
  const pairs = entries.flatMap(entry => Object.keys(forms).filter(form => entry[form]?.length).map(form => ({entry, form})));
  const categories = { regular: 'Regular', irregular: 'Irregular', hada: '하다' };
  const selectedForms = new Set(Object.keys(forms));
  const selectedCategories = new Set(Object.keys(categories));
  const matches = ({entry, form}) => selectedForms.has(form) && selectedCategories.has(entry.category);
  let deck = [];
  function newQuestion(focus = false) {
    if (!deck.length) {
      deck = pairs.filter(matches);
      for (let index = deck.length - 1; index > 0; index--) {
        const other = Math.floor(Math.random() * (index + 1));
        [deck[index], deck[other]] = [deck[other], deck[index]];
      }
      if (deck.length > 1 && deck.at(-1) === current) [deck[0], deck[deck.length - 1]] = [deck.at(-1), deck[0]];
    }
    current = deck.pop();
    get('question').hidden = !current;
    get('empty').hidden = Boolean(current);
    if (!current) return;
    const {entry, form} = current;
    get('word').textContent = entry.word;
    get('kind').textContent = entry.kind;
    get('meaning').textContent = entry.meaning;
    const target = get('target');
    target.dataset.form = form;
    target.textContent = forms[form].label;
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
  function addFilters(host, options, selected) {
    for (const [value, label] of Object.entries(options)) {
      const wrapper = document.createElement('label');
      if (host.id === 'forms') wrapper.dataset.form = value;
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = true;
      input.addEventListener('change', () => {
        if (input.checked) selected.add(value);
        else selected.delete(value);
        for (const item of host.querySelectorAll('input')) item.disabled = item.checked && selected.size === 1;
        deck = [];
        if (!current || !matches(current)) newQuestion();
      });
      if (value === 'hada') wrapper.lang = 'ko';
      wrapper.append(input, label);
      host.append(wrapper);
    }
  }
  addFilters(get('forms'), Object.fromEntries(Object.entries(forms).map(([form, {label}]) => [form, label])), selectedForms);
  addFilters(get('categories'), categories, selectedCategories);
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
    if (!correct) {
      feedback.append(expected);
      const explanation = explain(current.entry, current.form);
      if (explanation) {
        const detail = document.createElement('span');
        detail.className = 'explanation';
        detail.textContent = explanation;
        feedback.append(detail);
      }
    }
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
