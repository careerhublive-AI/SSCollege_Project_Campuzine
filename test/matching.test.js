// Acceptance examples from the blueprint (Sabari section 3, Module B).
const test = require('node:test');
const assert = require('node:assert');
const { rank } = require('../src/services/matchingService');
const { normalize, detectLanguage } = require('../src/services/textService');

const faqs = [
  { id: 'courses', keywords: [{ keyword: 'course' }, { keyword: 'programme' }, { keyword: 'കോഴ്സ' }], questions: ['What courses are available?', 'കോളേജിൽ ഏതൊക്കെ കോഴ്സുകളുണ്ട്?'] },
  { id: 'admissions', keywords: [{ keyword: 'admission' }, { keyword: 'apply' }, { keyword: 'അഡ്മിഷ' }], questions: ['How can I apply for admission?', 'അഡ്മിഷൻ എങ്ങനെ ലഭിക്കും?'] },
  { id: 'hod-english', keywords: [{ keyword: 'hod english' }, { keyword: 'ഇംഗ്ലീഷ് മേധാവി' }], questions: ['Who is the HOD of English?'] },
  { id: 'departments', keywords: [{ keyword: 'department' }, { keyword: 'hod' }], questions: ['Which departments are there?'] },
  { id: 'contact', keywords: [{ keyword: 'located' }, { keyword: 'location' }, { keyword: 'എവിടെ' }], questions: ['Where is the college located?', 'കോളേജ് എവിടെയാണ്?'] },
].map((f) => ({ ...f, keywords: f.keywords.map((k) => ({ ...k, keyword: normalize(k.keyword) })) }));

const cases = [
  ['What courses are available?', 'courses'],
  ['How can I apply for admission?', 'admissions'],
  ['Who is the HOD of English?', 'hod-english'],
  ['Where is the college located?', 'contact'],
  ['കോളേജിൽ ഏതൊക്കെ കോഴ്സുകളുണ്ട്?', 'courses'],
  ['അഡ്മിഷൻ എങ്ങനെ ലഭിക്കും?', 'admissions'],
  ['കോളേജ് എവിടെയാണ്?', 'contact'],
];

for (const [q, expected] of cases) {
  test(`matches "${q}"`, () => {
    const r = rank(q, faqs, { threshold: 1 });
    assert.ok(r.best, 'expected an answer');
    assert.strictEqual(r.best.id, expected);
  });
}

test('does not invent an answer for unrelated questions', () => {
  assert.strictEqual(rank('What is the weather today?', faqs, { threshold: 1 }).best, null);
  assert.strictEqual(rank('', faqs, { threshold: 1 }).best, null);
});

test('zero-width joiners in Malayalam typing do not break matching', () => {
  const r = rank('കോഴ്‌സുകൾ', faqs, { threshold: 1 }); // contains U+200C
  assert.strictEqual(r.best && r.best.id, 'courses');
});

test('detects Malayalam script', () => {
  assert.strictEqual(detectLanguage('കോളേജ് എവിടെയാണ്?'), 'ml');
  assert.strictEqual(detectLanguage('Where is the college?'), 'en');
});
