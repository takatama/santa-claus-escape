import test from 'node:test';
import assert from 'node:assert/strict';
import { readingMarkup } from '../readings.js';
import { productionScenes } from '../full-scenario.js';

test('readings: every production sentence keeps its exact original base text, numbers and punctuation',()=>{
  for(const segments of Object.values(productionScenes()))for(const {text} of segments) {
    const html=readingMarkup(text);
    const base=html.replace(/<[^>]*>/g,'').replaceAll('&amp;','&').replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&quot;','"').replaceAll('&#39;',"'");
    assert.equal(base,text);
    assert.match(html,/<ruby>/);
  }
});
test('readings: contextual opening words have distinct readings and no answer is added',()=>{
  assert.match(readingMarkup('箱が開きました！'),/data-reading="あきました"/);
  assert.match(readingMarkup('枝を開く'),/data-reading="ひらく"/);
  assert.equal(readingMarkup('グー、チョキ、パー、グー'),'グー、チョキ、パー、グー');
  assert.equal(readingMarkup('だいすきだよ'),'だいすきだよ');
});
test('readings: unknown and user supplied text is escaped rather than interpreted as markup',()=>{
  assert.equal(readingMarkup('<img src=x onerror="alert(1)"> & 1234'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt; &amp; 1234');
});
