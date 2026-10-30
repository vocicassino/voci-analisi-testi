import {test} from 'node:test';
import assert from 'node:assert/strict';
import {inspectMarkers, journalismReview} from '../marker-audit.mjs';

test('testo italiano normale: nessun marcatore',()=>{
 const result=inspectMarkers('Cassino: la città discute il trasporto scolastico, i servizi e la manutenzione.');
 assert.equal(result.total,0);
 assert.match(result.conclusion,/NON esclude/);
});
test('spazi zero-width e spazi speciali vengono classificati',()=>{
 const r=inspectMarkers('Ca\u200Bssino\u2009 oggi');
 assert.equal(r.total,2);
 assert.equal(r.kinds.invisibili,1);
 assert.equal(r.kinds.spazi,1);
 assert.deepEqual(r.markers.map(x=>x.code),['U+200B','U+2009']);
});
test('le sequenze concentrate sono riportate come da esaminare',()=>{
 const r=inspectMarkers('inizio\u200B\u2060\u200Bfine');
 assert.equal(r.sequences.length,1);
 assert.equal(r.sequences[0].line,1);
 assert.equal(r.sequences[0].length,3);
});
test('selettori supplementari vengono contati con il codice completo',()=>{
 const r=inspectMarkers('a\u{E0100}');
 assert.equal(r.total,1);
 assert.equal(r.markers[0].code,'U+0E0100');
 assert.equal(r.kinds.selettori,1);
});
test('TAG ASCII codificati vengono mostrati come sequenze, senza attribuzione IA',()=>{
 const tagString=[...'ciao'].map(c=>String.fromCodePoint(0xE0000+c.codePointAt(0))).join('');
 const r=inspectMarkers('test '+tagString);
 assert.equal(r.kinds.tag,4);
 assert.ok(r.sequences.some(x=>x.detail.includes('ciao')));
 assert.match(r.conclusion,/Nessuno è prova/);
});
test('emoji con ZWJ e selettori normali non fanno falsi allarmi',()=>{
 const r=inspectMarkers('Test 👩‍💻 👩🏽‍⚕️ ©️ 1️⃣');
 assert.equal(r.total,0);
});
test('emoji bandiere regionali a TAG sono considerate legittime',()=>{
 const tagFor=s=>[...s].map(c=>String.fromCodePoint(0xE0000+c.codePointAt(0))).join('');
 const r=inspectMarkers('🏴'+tagFor('gbsct')+String.fromCodePoint(0xE007F));
 assert.equal(r.total,0);
});
test('revisione giornalistica avverte su attribuzioni e presunzione',()=>{
 const r=journalismReview('Oggi si dice che il responsabile sia stato individuato.');
 assert.ok(r.some(x=>x.title==='Attribuzione da precisare'));
 assert.ok(r.some(x=>x.title==='Presunzione di innocenza'));
 assert.ok(r.some(x=>x.title==='Riferimenti temporali'));
 assert.ok(r.some(x=>x.title==='SegnalaFacile'));
});
test('revisione giornalistica non modifica il testo',()=>{
 const t='Notizia verificata. Una fonte ufficiale conferma il luogo.';
 journalismReview(t);
 assert.equal(t,'Notizia verificata. Una fonte ufficiale conferma il luogo.');
});
