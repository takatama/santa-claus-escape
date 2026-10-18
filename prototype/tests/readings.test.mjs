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
    for(const match of html.matchAll(/<ruby>([^<]+)<rt aria-hidden="true" data-reading="([^"]+)">/g)) {
      assert.match(match[1],/^[一-龯]+$/);
      assert.match(match[2],/^[ぁ-ん]+$/);
    }
  }
});
test('readings: contextual opening words have distinct readings and no answer is added',()=>{
  assert.match(readingMarkup('箱が開きました！'),/<ruby>開<rt aria-hidden="true" data-reading="あ"><\/rt><\/ruby>きました！/);
  assert.match(readingMarkup('枝を開く'),/<ruby>開<rt aria-hidden="true" data-reading="ひら"><\/rt><\/ruby>く/);
  assert.equal(readingMarkup('グー、チョキ、パー、グー'),'グー、チョキ、パー、グー');
  assert.equal(readingMarkup('だいすきだよ'),'だいすきだよ');
});
test('readings: okurigana stays outside ruby, including between kanji runs',()=>{
  const cases=[
    ['サンタを助ける',[['助','たす']]],
    ['閉じ込められた',[['閉','と'],['込','こ']]],
    ['読み返す・読み直す・聞き直す',[['読','よ'],['返','かえ'],['読','よ'],['直','なお'],['聞','き'],['直','なお']]],
    ['書き込み・生き物・間に合う',[['書','か'],['込','こ'],['生','い'],['物','もの'],['間','ま'],['合','あ']]],
    ['読み上げ・読み込め・読み込んで',[['読','よ'],['上','あ'],['読','よ'],['込','こ'],['読','よ'],['込','こ']]],
    ['長持ち・大好き・心待ち・向こう',[['長持','ながも'],['大好','だいす'],['心待','こころま'],['向','む']]],
    ['三つ・知って・分かった・開いた',[['三','みっ'],['知','し'],['分','わ'],['開','あ']]],
  ];
  for(const [text,expected] of cases) {
    const html=readingMarkup(text);
    const actual=Array.from(html.matchAll(/<ruby>([^<]+)<rt aria-hidden="true" data-reading="([^"]+)"><\/rt><\/ruby>/g),m=>[m[1],m[2]]);
    assert.deepEqual(actual,expected,text);
    assert.equal(html.replace(/<[^>]*>/g,''),text);
    assert.ok(actual.every(([base])=>/^[一-龯]+$/.test(base)),text);
  }
});
test('readings: unknown and user supplied text is escaped rather than interpreted as markup',()=>{
  assert.equal(readingMarkup('<img src=x onerror="alert(1)"> & 1234'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt; &amp; 1234');
});
