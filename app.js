import {analyzeText, cleanText} from './analyzer.mjs';

const $ = selector => document.querySelector(selector);
const editor = $('#sourceText');
const body = $('#reportBody');
const cleanedPreview = document.createElement('textarea');
let lastResult = null;
let lastSource = '';
let activeTab = 'anomalies';
let toastHandle;

function el(tag, className = '', value = '') {
  const elem = document.createElement(tag);
  if (className) elem.className = className;
  if (value) elem.textContent = value;
  return elem;
}
function notify(message) {
  $('#toast').textContent = message;
  $('#toast').classList.add('show');
  clearTimeout(toastHandle);
  toastHandle = setTimeout(()=>$('#toast').classList.remove('show'), 3300);
}
function setCounts() {
  const text=editor.value;
  $('#wordCount').textContent = `${[...text.matchAll(/[\p{L}\p{M}]+(?:['’\-][\p{L}\p{M}]+)*/gu)].length} parole`;
  $('#charCount').textContent = `${text.length} caratteri`;
  if (text !== lastSource && lastResult) {
    lastResult=null;
    $('#technicalCount').textContent='—';
    $('#editorialCount').textContent='—';
    $('#traceCount').textContent='—';
    $('#statusLabel').textContent='Testo modificato';
    $('#statusLabel').classList.add('muted');
    render();
  }
}
function goto(offset, len=1) {
  editor.focus();
  editor.setSelectionRange(offset, Math.min(editor.value.length, offset+len));
  const before=editor.value.slice(0,offset);
  const lineCount=(before.match(/\n/g)||[]).length;
  editor.scrollTop=Math.max(0, lineCount*25-120);
}
function empty(title,description) {
  body.replaceChildren();
  const wrapper=el('div','empty-state');
  wrapper.append(el('span','','⌕'),el('h3','',title),el('p','',description));
  body.append(wrapper);
}
function addFinding(item, kind) {
  const finding=el('article','finding');
  const head=el('div','finding-top');
  head.append(el('h3','',kind==='anomaly'?item.label:item.title),el('span','tag',kind==='anomaly'?(item.fixable?'correggibile':'da verificare'):'editoriale'));
  finding.append(head);
  if(kind==='anomaly') {
    const note=el('p');
    note.append(document.createTextNode(`Riga ${item.line} · `),el('code','',item.code));
    finding.append(note);
    finding.append(el('div','context',item.excerpt));
    if(!item.fixable) finding.append(el('p','','Richiede un controllo umano: non viene rimosso automaticamente.'));
  } else {
    finding.append(el('p','',`Riga ${item.line} · «${item.phrase}»`));
    finding.append(el('p','',item.suggestion));
  }
  const link=el('button','','Vai al testo');
  link.type='button';
  link.addEventListener('click',()=>goto(item.offset,item.sample?.length || item.phrase?.length || 1));
  finding.append(link);
  body.append(finding);
}
function render() {
  document.querySelectorAll('.tab').forEach(button=>{
    const selected = button.dataset.tab===activeTab;
    button.classList.toggle('active',selected);
    button.setAttribute('aria-pressed',String(selected));
  });
  if (!lastResult) {
    empty('Il tuo rapporto apparirà qui','Incolla un testo e avvia l’analisi.');
    return;
  }
  body.replaceChildren();
  if (activeTab==='anomalies') {
    body.append(el('p','summary','Sono indicati solo caratteri e combinazioni identificabili tecnicamente. Non sono prova di un watermark IA.'));
    if(!lastResult.anomalies.length) body.append(el('p','success','Nessuna anomalia Unicode fra quelle controllate. Questo non esclude la presenza di watermark statistici.'));
    lastResult.anomalies.slice(0,150).forEach(x=>addFinding(x,'anomaly'));
    if(lastResult.anomalies.length>150) body.append(el('p','summary',`Altri ${lastResult.anomalies.length-150} elementi non mostrati.`));
  } else if(activeTab==='traces') {
    body.append(el('p','summary','Possibili residui di formattazione, citazioni o frasi di accompagnamento. Sono indizi di copia, non prove di paternità IA.'));
    if(!lastResult.traces.length) body.append(el('p','success','Nessuno dei residui di esportazione controllati è presente nel testo.'));
    lastResult.traces.forEach(item=>{
      const finding=el('article','finding');
      const head=el('div','finding-top');
      head.append(el('h3','',item.label),el('span','tag','da controllare'));
      finding.append(head,el('p','',`Riga ${item.line} · «${item.sample}»`),el('p','',item.suggestion));
      const link=el('button','','Vai al testo');link.type='button';
      link.addEventListener('click',()=>goto(item.offset,item.sample.length));
      finding.append(link);body.append(finding);
    });
  } else if(activeTab==='tips') {
    body.append(el('p','summary','Formule convenzionali e ripetizioni possono comparire anche in testi scritti da persone. Non è un rilevatore IA.'));
    if(!lastResult.tips.length) body.append(el('p','success','Nessuna delle formule editoriali monitorate è stata individuata. Ciò non dimostra l’origine umana del testo.'));
    lastResult.tips.slice(0,100).forEach(x=>addFinding(x,'tip'));
    if(lastResult.tips.length>100) body.append(el('p','summary',`Altri ${lastResult.tips.length-100} suggerimenti non mostrati.`));
  } else {
    body.append(el('p','clean-intro','La revisione automatica rimuove solo alcuni caratteri di controllo, spazi non separabili e separatori invisibili. Preserva caratteri direzionali, ZWJ/ZWNJ, emoji, punteggiatura e significato. NON rimuove né verifica textGrain.'));
    const source=editor.value;
    const clean=cleanText(source);
    const note=el('p','diff-note',clean===source?'Nessuna modifica tecnica necessaria.':'Sono state apportate modifiche tecniche ai caratteri consentiti. Controlla il risultato.');
    body.append(note);
    cleanedPreview.id='cleanedText';
    cleanedPreview.setAttribute('aria-label','Testo revisionato, modificabile');
    cleanedPreview.value=clean;
    body.append(cleanedPreview);
    const actions=el('div','clean-actions');
    const copy=el('button','btn primary','Copia testo revisionato');
    copy.type='button';
    copy.addEventListener('click',()=>copyText(cleanedPreview.value));
    const download=el('button','btn ghost','Esporta .txt');
    download.type='button';
    download.addEventListener('click',()=>{
      const blob=new Blob([cleanedPreview.value],{type:'text/plain;charset=utf-8'});
      const url=URL.createObjectURL(blob);
      const anchor=document.createElement('a');
      anchor.href=url;anchor.download='voci-di-cassino-testo-revisionato.txt';
      document.body.append(anchor);anchor.click();anchor.remove();
      setTimeout(()=>URL.revokeObjectURL(url),2000);
      notify('File di testo esportato.');
    });
    actions.append(copy,download);
    body.append(actions);
  }
}
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    notify('Testo copiato negli appunti.');
  } catch {
    cleanedPreview.focus();cleanedPreview.select();
    notify('Selezione effettuata: usa il comando Copia del dispositivo.');
  }
}
function analyze() {
  const source=editor.value;
  if(!source.trim()) {notify('Incolla prima un testo da analizzare.');editor.focus();return;}
  lastResult=analyzeText(source);
  lastSource=source;
  $('#technicalCount').textContent=lastResult.anomalies.length;
  $('#editorialCount').textContent=lastResult.tips.length;
  $('#traceCount').textContent=lastResult.traces.length;
  $('#statusLabel').textContent='Analisi completata';
  $('#statusLabel').classList.remove('muted');
  render();
  if (window.innerWidth<851) $('#reportTitle').scrollIntoView({behavior:'smooth',block:'start'});
}

$('#analyzeBtn').addEventListener('click',analyze);
$('#sourceText').addEventListener('input',setCounts);
$('#clearBtn').addEventListener('click',()=>{
  editor.value='';lastResult=null;lastSource='';
  $('#technicalCount').textContent='—';$('#editorialCount').textContent='—';$('#traceCount').textContent='—';
  $('#statusLabel').textContent='Da analizzare';$('#statusLabel').classList.add('muted');
  setCounts();render();editor.focus();
});
$('#exampleBtn').addEventListener('click',()=>{
  editor.value='È fondamentale sottolineare che la manutenzione è al centro del dibattito.\n\nSecondo una segnalazione, è importante ricordare che ci sono situazioni ancora da verificare.\n\nQui c’è uno spazio invisibile: fo\u200Bo; qui uno spazio non separabile: Voci\u00a0di Cassino.\n\nNon si tratta soltanto di un tema tecnico. Occorre fare chiarezza.';
  setCounts();analyze();
});
document.querySelectorAll('.tab').forEach(btn=>btn.addEventListener('click',()=>{activeTab=btn.dataset.tab;render();}));
setCounts();
if('serviceWorker' in navigator && location.protocol==='https:') {
  window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
}
