import {test} from 'node:test';
import assert from 'node:assert/strict';
import {analyzeText,cleanText} from '../analyzer.mjs';

test('rileva invisibili e spazi non separabili',()=>{
 const r=analyzeText('Cassino\u200B notizia\u00A0oggi');
 assert.equal(r.anomalies.length,2);
 assert.equal(r.anomalies[0].code,'U+200B');
 assert.equal(r.anomalies[1].code,'U+00A0');
});
test('pulizia prudente dei caratteri correggibili',()=>{
 assert.equal(cleanText('Cassi\u200Bno\u00A0oggi\uFEFF'),'Cassino oggi');
});
test('non modifica ZWJ e caratteri direzionali',()=>{
 assert.equal(cleanText('👩‍💻\u200F'),'👩‍💻\u200F');
});
test('non interpreta emoji ZWJ come anomalie',()=>{
 assert.equal(analyzeText('👩‍💻').anomalies.length,0);
});
test('rileva caratteri omoglifi di alfabeti differenti',()=>{
 const r=analyzeText('Cаssino'); // a cirillica
 assert.equal(r.anomalies.length,1);
 assert.equal(r.anomalies[0].category,'alfabeti');
});
test('i cliché sono suggerimenti editoriali e non prove di IA',()=>{
 const r=analyzeText('È fondamentale sottolineare quanto accaduto.');
 assert.ok(r.tips.some(t=>t.category==='formula'));
 assert.match(r.disclaimer,/Non è possibile verificare textGrain/);
});
test('mantiene accenti e paragrafi durante la pulizia',()=>{
 assert.equal(cleanText('Città\r\n\r\nNotizie'), 'Città\n\nNotizie');
});

test('rileva riferimenti di esportazione senza dedurre paternità',()=>{
 const r=analyzeText('Ecco un articolo: citeturn0search1');
 assert.ok(r.traces.length>=2);
 assert.match(r.disclaimer,/Non è possibile/);
});
