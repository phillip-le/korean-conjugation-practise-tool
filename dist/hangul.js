const initials = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
const vowels = 'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ';
const finals = ' ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ';
const joinedVowels = {ㅗㅏ:'ㅘ',ㅗㅐ:'ㅙ',ㅗㅣ:'ㅚ',ㅜㅓ:'ㅝ',ㅜㅔ:'ㅞ',ㅜㅣ:'ㅟ',ㅡㅣ:'ㅢ'};
const joinedFinals = {ㄱㅅ:'ㄳ',ㄴㅈ:'ㄵ',ㄴㅎ:'ㄶ',ㄹㄱ:'ㄺ',ㄹㅁ:'ㄻ',ㄹㅂ:'ㄼ',ㄹㅅ:'ㄽ',ㄹㅌ:'ㄾ',ㄹㅍ:'ㄿ',ㄹㅎ:'ㅀ',ㅂㅅ:'ㅄ'};
const splitFinals = Object.fromEntries(Object.entries(joinedFinals).map(([pair, joined]) => [joined, pair]));

export function compose(keys) {
  let output = '', initial = '', vowel = '', final = '';
  function flush() {
    output += initial && vowel
      ? String.fromCharCode(0xac00 + (initials.indexOf(initial) * 21 + vowels.indexOf(vowel)) * 28 + (final ? finals.indexOf(final) : 0))
      : initial + vowel;
    initial = vowel = final = '';
  }
  for (const key of keys) {
    if (vowels.includes(key)) {
      if (final) {
        const parts = splitFinals[final] ?? final;
        const carry = parts.at(-1);
        final = parts.slice(0, -1);
        flush();
        initial = carry;
      } else if (vowel) {
        const joined = joinedVowels[vowel + key];
        if (joined) {
          vowel = joined;
          continue;
        }
        flush();
      }
      vowel = key;
    } else if (initial && vowel && !final && finals.includes(key)) {
      final = key;
    } else if (joinedFinals[final + key]) {
      final = joinedFinals[final + key];
    } else {
      flush();
      initial = key;
    }
  }
  flush();
  return output;
}
