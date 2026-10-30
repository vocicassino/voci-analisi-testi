import {analyzeText, cleanText} from './analyzer.mjs';
import {inspectMarkers, journalismReview} from './marker-audit.mjs';

const $ = selector => document.querySelector(selector);
const editor = $('#sourceText');
const body = $('#reportBody');
const cleanedPreview = document.createElement('textarea');
let lastResult = null;
let lastMarkers = null;
let lastJournal = null;
let lastSource = '';
let activeTab = 'markers';
let toastHandle;

function el(tag, className = '', value = '') {
  const elem = document.createElement(tag);
  if (className) elem.className = className;
  if (value !== '') elem.textContent = String(value);
  return elem;
}
function notify(message) {
  $('#toast').textContent = message;
  $('#toast').classList.add('show');
  clearTimeout(toastHandle);
  toastHandle = setTimeout(()=>$('#toast').classList.remove('show'),3300);
}
function clearMetrics(message='Da analizzare') {
  for(const id of ['markerCount','technicalCount','editorialCount','traceCount']) $('#'+id).textContent='—';
  $('#statusLabel').textContent=message;
  $('#statusLabel').classList.add('muted');
}
function setCounts() {
  const text=editor.value;
  $('#wordCount').textContent = `${[...text.matchAll(/[\p{L}\p{M}]+(?:['’\-][\p{L}\p{M}]+)*/gu)].length} parole`;
  $('#charCount').textContent = `${text.length} caratteri`;
  if (text !== lastSource && lastResult) {
    lastResult=lastMarkers=lastJournal=null;
    clearMetrics('Testo modificato');
    render();
  }
}
function goto(offset, len=1) {
  editor.focus();
  editor.setSelectionRange(offset,Math.min(editor.value.length,offset+len));
  const lineCount=(editor.value.slice(0,offset).match(/\n/g)||[]).length;
  editor.scrollTop=Math.max(0,lineCount*25-120);
  editor.scrollIntoView({behavior:'smooth',block:'center'});
}
function empty(title,description) {
  body.replaceChildren();
  const wrapper=el('div','empty-state');
  wrapper.append(el('span','','⌕'),el('h3','',title),el('p','',description));
  body.append(wrapper);
}
function actionToText(item) {
  const link=el('button','','Vai al testo');
  link.type='button';
  link.addEventListener('click',()=>goto(item.offset,item.length||item.sample?.length||item.phrase?.length||1));
  return link;
}
function addFinding(item,kind) {
  const finding=el('article','finding');
  const head=el('div','finding-top');
  head.append(el('h3','',kind==='anomaly'?item.label:item.title),el('span','tag',kind==='anomaly'?(item.fixable?'correggibile':'da verificare'):'editoriale'));
  finding.append(head);
  if(kind==='anomaly') {
    finding.append(el('p','',`Riga ${item.line} · ${item.code}`),el('div','context',item.excerpt));
    if(!item.fixable) finding.append(el('p','','Richiede controllo umano: non viene rimosso automaticamente.'));
  } else {
    finding.append(el('p','',`Riga ${item.line} · «${item.phrase}»`),el('p','',item.suggestion));
  }
  finding.append(actionToText(item));
  body.append(finding);
}
function renderMarkers() {
  body.append(el('p','summary','Scansione approfondita di segni Unicode non visibili o insoliti: zero-width, selettori di variante, TAG, caratteri di riempimento, spazi speciali e sequenze concentrate. Questi risultati NON identificano filigrane di ChatGPT.'));
  const total=lastMarkers.total;
  body.append(el('p',total?'scan-note':'success',lastMarkers.conclusion));
  const categories=[['invisibili','Invisibili e direzionali'],['selettori','Selettori di variante'],['tag','Codici TAG'],['spazi','Spazi speciali'],['riempitivi','Caratteri riempitivi']];
  const grid=el('div','scan-categories');
  for(const [key,label] of categories){const box=el('div','scan-category');box.append(el('strong','',lastMarkers.kinds[key]),el('span','',label));grid.append(box);}
  body.append(grid);
  if(lastMarkers.sequences.length) {
    body.append(el('h3','','Sequenze da esaminare'));
    for(const item of lastMarkers.sequences.slice(0,30)) {
      const card=el('article','finding');
      card.append(el('h3','',item.label),el('p','',`Riga ${item.line} · ${item.detail}`),actionToText(item));
      body.append(card);
    }
  }
  if(total) body.append(el('h3','','Dettaglio caratteri'));
  for(const item of lastMarkers.markers.slice(0,140)) {
    const card=el('article','finding');
    const top=el('div','finding-top');
    top.append(el('h3','',item.label),el('span','tag','Unicode'));
    card.append(top,el('p','',`Riga ${item.line} · ${item.code}`),el('div','context',item.excerpt),el('p','notice',item.note),actionToText(item));
    body.append(card);
  }
  if(total>140) body.append(el('p','scan-note',`Mostrati i primi 140 di ${total} marcatori rilevati. La scansione considera l’intero testo.`));
}
function renderJournalism() {
  body.append(el('p','summary','Checklist per la pubblicazione: non riscrive automaticamente i fatti, né inventa fonti. Valuta tono, attribuzioni, date e presunzione di innocenza.'));
  for (const item of lastJournal) {
    const card=el('article','finding');
    const head=el('div','finding-top');
    head.append(el('h3','',item.title),el('span',item.severity==='attenzione'?'tag warning':'tag',item.severity==='attenzione'?'verifica':'consiglio'));
    card.append(head,el('p','',item.detail));
    body.append(card);
  }
}
function renderClean() {
  body.append(el('p','clean-intro','La pulizia automatica elimina soltanto alcuni caratteri tecnici e normalizza gli spazi. Non rimuove e non verifica filigrane statistiche; conserva emoji, caratteri direzionali, citazioni e significato. Verifica sempre prima di pubblicare.'));
  const source=editor.value;
  const clean=cleanText(source);
  body.append(el('p','diff-note',clean===source?'Nessuna modifica tecnica necessaria.':'Sono state apportate modifiche tecniche controllabili; verifica il risultato.'));
  cleanedPreview.id='cleanedText';
  cleanedPreview.setAttribute('aria-label','Testo revisionato, modificabile');
  cleanedPreview.value=clean;
  body.append(cleanedPreview);
  const actions=el('div','clean-actions');
  const copy=el('button','btn primary','Copia testo revisionato');
  copy.type='button';copy.addEventListener('click',()=>copyText(cleanedPreview.value));
  const download=el('button','btn ghost','Esporta .txt');
  download.type='button';download.addEventListener('click',()=>downloadText(cleanedPreview.value,'voci-di-cassino-testo-revisionato.txt'));
  actions.append(copy,download);body.append(actions);
}
function render() {
  document.querySelectorAll('.tab').forEach(button=>{
    const selected=button.dataset.tab===activeTab;
    button.classList.toggle('active',selected);
    button.setAttribute('aria-pressed',String(selected));
  });
  if(!lastResult) {empty('Il tuo rapporto apparirà qui','Incolla un testo e avvia l’analisi.');return;}
  body.replaceChildren();
  if(activeTab==='markers') renderMarkers();
  else if(activeTab==='journalism') renderJournalism();
  else if(activeTab==='anomalies'){
    body.append(el('p','summary','Caratteri tecnici e alfabeti mescolati: i risultati non sono prova di un watermark IA.'));
    if(!lastResult.anomalies.length) body.append(el('p','success','Nessuna anomalia fra quelle controllate. Questo non esclude filigrane statistiche.'));
    lastResult.anomalies.slice(0,150).forEach(x=>addFinding(x,'anomaly'));
  } else if(activeTab==='traces') {
    body.append(el('p','summary','Residui di formattazione e risposte conversazionali. Possono derivare anche da copiature o da testi scritti da persone.'));
    if(!lastResult.traces.length) body.append(el('p','success','Nessun residuo fra quelli controllati.'));
    for(const item of lastResult.traces){
      const card=el('article','finding');
      card.append(el('h3','',item.label),el('p','',`Riga ${item.line} · «${item.sample}»`),el('p','',item.suggestion),actionToText(item));body.append(card);
    }
  } else if(activeTab==='tips') {
    body.append(el('p','summary','Indizi stilistici comuni anche nella scrittura umana. Sono suggerimenti, non un riconoscitore IA.'));
    if(!lastResult.tips.length) body.append(el('p','success','Nessuna formula monitorata individuata: non indica l’origine del testo.'));
    lastResult.tips.slice(0,100).forEach(x=>addFinding(x,'tip'));
  } else if(activeTab==='clean') renderClean();
}
function downloadText(content,filename) {
  const blob=new Blob([content],{type:'text/plain;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const anchor=document.createElement('a');anchor.href=url;anchor.download=filename;
  document.body.append(anchor);anchor.click();anchor.remove();
  setTimeout(()=>URL.revokeObjectURL(url),2000);
  notify('File esportato.');
}
async function copyText(text) {
  try {await navigator.clipboard.writeText(text);notify('Testo copiato negli appunti.');}
  catch {cleanedPreview.focus();cleanedPreview.select();notify('Testo selezionato: usa Copia del dispositivo.');}
}
function analyze() {
  const source=editor.value;
  if(!source.trim()) {notify('Incolla prima un testo da analizzare.');editor.focus();return;}
  lastResult=analyzeText(source);
  lastMarkers=inspectMarkers(source);
  lastJournal=journalismReview(source);
  lastSource=source;
  $('#markerCount').textContent=lastMarkers.total;
  $('#technicalCount').textContent=lastResult.anomalies.length;
  $('#editorialCount').textContent=lastResult.tips.length;
  $('#traceCount').textContent=lastResult.traces.length;
  $('#statusLabel').textContent='Analisi completata';
  $('#statusLabel').classList.remove('muted');
  render();
  if(window.innerWidth<851) $('#reportTitle').scrollIntoView({behavior:'smooth',block:'start'});
}
$('#analyzeBtn').addEventListener('click',analyze);
$('#sourceText').addEventListener('input',setCounts);
$('#clearBtn').addEventListener('click',()=>{
  editor.value='';lastResult=lastMarkers=lastJournal=null;lastSource='';
  clearMetrics();setCounts();render();editor.focus();
});
$('#exampleBtn').addEventListener('click',()=>{
  editor.value='È importante ricordare che la manutenzione è al centro del dibattito.\n\nSecondo indiscrezioni, è necessario fare chiarezza.\n\nEcco uno spazio invisibile: Ca\u200Bssino; qui uno spazio speciale: Voci\u2009di Cassino; e una sequenza: prova\u200B\u2060\u200Btest.\n\nPer saperne di più, bisogna controllare le fonti. ﹏';
  setCounts();analyze();
});
document.querySelectorAll('.tab').forEach(btn=>btn.addEventListener('click',()=>{activeTab=btn.dataset.tab;render();}));
setCounts();
if('serviceWorker' in navigator && location.protocol==='https:') window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
