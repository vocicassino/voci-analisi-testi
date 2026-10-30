/**
 * Analisi tecnica/editoriale locale. NON è un rilevatore di filigrane statistiche
 * né un classificatore affidabile di testi generati da IA.
 */
const controls = new Map([
  [0x200b, ['Spazio a larghezza zero', 'invisibile', true]],
  [0x200c, ['Separatore a larghezza zero (ZWNJ)', 'invisibile', false]],
  [0x200d, ['Congiunzione a larghezza zero (ZWJ)', 'invisibile', false]],
  [0x2060, ['Separatore invisibile di parole', 'invisibile', true]],
  [0xfeff, ['Segno BOM / spazio invisibile', 'invisibile', true]],
  [0x00ad, ['Trattino facoltativo invisibile', 'invisibile', true]],
  [0x034f, ['Combining Grapheme Joiner', 'invisibile', false]],
  [0x180e, ['Separatore mongolo obsoleto', 'invisibile', false]],
  [0x00a0, ['Spazio non separabile', 'spazio', true]],
  [0x202f, ['Spazio stretto non separabile', 'spazio', true]],
  [0x200e, ['Segno direzionale da sinistra a destra', 'direzionalità', false]],
  [0x200f, ['Segno direzionale da destra a sinistra', 'direzionalità', false]],
  [0x061c, ['Segno direzionale arabo', 'direzionalità', false]],
]);
for (let code = 0x202a; code <= 0x202e; code++) controls.set(code, ['Controllo di direzionalità Unicode', 'direzionalità', false]);
for (let code = 0x2066; code <= 0x2069; code++) controls.set(code, ['Isolamento direzionale Unicode', 'direzionalità', false]);

const exportTraces = [
  [/cite[^]{1,500}/gu, 'Marcatura di citazione', 'È presente un codice di citazione non adatto alla pubblicazione. Verifica le fonti originali.'],
  [/【turn\d+(?:search|news|fetch|view|file)\d+】/gu, 'Riferimento tecnico di fonte', 'Il riferimento a una fonte non è un link utilizzabile: controllalo e sostituiscilo con una citazione corretta.'],
  [/\bturn\d+(?:search|news|fetch|view|file)\d+\b/gu, 'Identificatore interno di fonte', 'È un identificatore tecnico e non un riferimento leggibile dai lettori.'],
  [/\bcome (?:modello linguistico|intelligenza artificiale)\b/giu, 'Formula autoreferenziale', 'Controlla se è una citazione voluta o una frase da eliminare dalla copia pubblicabile.'],
  [/\bse vuoi, posso (?:anche )?(?:preparare|creare|riscrivere|adattare|aggiungere)\b/giu, 'Frase di assistenza lasciata nel testo', 'Potrebbe essere rimasta una parte della conversazione invece dell’articolo definitivo.'],
  [/\becco (?:il|un|una|la) (?:testo|articolo|versione|bozza)\b/giu, 'Introduzione di consegna', 'Verifica se si tratta di una premessa anziché di contenuto editoriale.'],
  [/(?:^|\n)\s{0,3}#{1,5}\s+[^\n]+/gm, 'Titolo in formato Markdown', 'Può essere una formattazione voluta, ma spesso non va incollata letteralmente in un post Facebook.'],
  [/\*\*[^*\n]{2,140}\*\*/g, 'Grassetto in formato Markdown', 'Verifica se i due asterischi sono adatti al canale di pubblicazione.'],
];

const cliché = [
  ['è fondamentale sottolineare', 'Valuta di entrare direttamente nel fatto.'],
  ['è importante ricordare', 'Inserisci il fatto concreto anziché l’introduzione.'],
  ['in un mondo sempre più', 'Sostituisci la formula con un contesto specifico.'],
  ['in un contesto in cui', 'Indica il contesto con parole precise.'],
  ['non si tratta soltanto di', 'Rendi l’affermazione più diretta.'],
  ['non è solo una questione di', 'Chiarisci subito qual è il problema.'],
  ['al centro del dibattito', 'Indica chi ne sta discutendo e perché.'],
  ['resta da vedere', 'Specifica quale sviluppo è ancora da verificare.'],
  ['il tempo dirà', 'Descrivi le scadenze o i fatti attesi.'],
  ['una situazione che solleva interrogativi', 'Indica quali domande concrete restano aperte.'],
  ['un tema che continua a far discutere', 'Precisa i soggetti e i motivi del confronto.'],
  ['un segnale importante', 'Spiega che cosa è cambiato concretamente.'],
  ['non possiamo ignorare', 'Porta dati o testimonianze verificabili.'],
  ['mai come oggi', 'Indica una data o una tendenza documentata.'],
  ['fare luce sulla vicenda', 'Descrivi quali informazioni mancano.'],
  ['occorre fare chiarezza', 'Formula domande a cui servono risposte.'],
];

const toCode = ch => 'U+' + ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0');
const wordRegex = /[\p{L}\p{M}]+(?:['’\-][\p{L}\p{M}]+)*/gu;
const latin = /\p{Script=Latin}/u;
const cyrillic = /\p{Script=Cyrillic}/u;
const greek = /\p{Script=Greek}/u;
const emoji = /\p{Extended_Pictographic}/u;

function position(text, offset) {
  return 1 + [...text.slice(0, offset)].filter(c => c === '\n').length;
}
function excerpt(text, start, length=1) {
  return text.slice(Math.max(0, start - 25), Math.min(text.length, start + length + 25)).replace(/\n/g, ' ↵ ');
}

export function analyzeText(raw) {
  const text = typeof raw === 'string' ? raw : String(raw ?? '');
  const anomalies = [];
  for (let index = 0; index < text.length;) {
    const code = text.codePointAt(index);
    const char = String.fromCodePoint(code);
    const item = controls.get(code);
    const rawControl = ((code <= 0x1f && code !== 10 && code !== 13 && code !== 9) || (code >= 0x7f && code <= 0x9f));
    const prev = index ? String.fromCodePoint(text.codePointAt(index-1)) : '';
    const next = String.fromCodePoint(text.codePointAt(index + char.length) ?? 0);
    const emojiSequence = code === 0x200d && (emoji.test(prev) || emoji.test(next));
    if (item && !emojiSequence) anomalies.push({
      id: 'a'+index, category: item[1], label: item[0], code: toCode(char),
      offset: index, line: position(text,index), excerpt: excerpt(text,index,char.length), fixable:item[2]
    });
    if (!item && rawControl) anomalies.push({
      id:'a'+index, category:'controllo', label:'Carattere di controllo non stampabile',
      code:toCode(char),offset:index,line:position(text,index), excerpt:excerpt(text,index,char.length), fixable:true
    });
    index += char.length;
  }
  const mixedScripts = [];
  for (const match of text.matchAll(wordRegex)) {
    const value=match[0];
    if (latin.test(value) && (cyrillic.test(value) || greek.test(value))) {
      mixedScripts.push({id:'m'+match.index,category:'alfabeti',label:'Alfabeti mescolati nella stessa parola',
        code:[...value].map(toCode).join(' '),offset:match.index,line:position(text,match.index),
        excerpt:excerpt(text,match.index,value.length),sample:value,fixable:false});
    }
  }
  const traces=[];
  for (const [pattern,label,suggestion] of exportTraces) {
    pattern.lastIndex=0;
    for (const m of text.matchAll(pattern)) {
      if (traces.length >= 80) break;
      traces.push({id:'x'+m.index,label,sample:m[0].slice(0,180),suggestion,offset:m.index,line:position(text,m.index)});
    }
  }
  traces.sort((a,b)=>a.offset-b.offset);
  const tips = [];
  const lower = text.toLocaleLowerCase('it-IT');
  for (const [phrase,suggestion] of cliché) {
    let from=0, count=0;
    while (true) {
      const at=lower.indexOf(phrase,from);
      if (at < 0 || count >= 10) break;
      const before=at>0 ? lower[at-1] : '';
      const after=lower[at+phrase.length] || '';
      if ((!before || !/[\p{L}\p{M}]/u.test(before)) && (!after || !/[\p{L}\p{M}]/u.test(after))) {
        tips.push({id:'t'+at, category:'formula',title:'Formula generica',phrase:text.slice(at,at+phrase.length),
          suggestion,offset:at,line:position(text,at)});
        count++;
      }
      from=at+phrase.length;
    }
  }
  const words = [...lower.matchAll(wordRegex)].map(m=>({value:m[0],index:m.index}));
  const three = new Map();
  for (let i=0;i<words.length-2;i++) {
    const group=words.slice(i,i+3).map(x=>x.value);
    if (group.every(x=>x.length<5)) continue;
    const key=group.join(' ');
    if (!three.has(key)) three.set(key, []);
    three.get(key).push(words[i].index);
  }
  [...three.entries()].filter(([,offsets])=>offsets.length>=3).sort((a,b)=>b[1].length-a[1].length).slice(0,5).forEach(([phrase,offsets])=>{
    tips.push({id:'r'+offsets[0],category:'ripetizione',title:'Sequenza ripetuta',phrase,
      suggestion:`Queste tre parole ricorrono ${offsets.length} volte. Controlla se la ripetizione è voluta.`,
      offset:offsets[0],line:position(text,offsets[0])});
  });
  let cursor=0;
  for (const m of text.matchAll(/[^.!?\n]+(?:[.!?]+|$)/g)) {
    if (!m[0].trim()) continue;
    const len=[...m[0].matchAll(wordRegex)].length;
    if (len>46) tips.push({id:'l'+m.index,category:'lunghezza',title:'Frase molto lunga',
      phrase:`${len} parole`,suggestion:'Valuta di dividerla per migliorarne la leggibilità.',offset:m.index,line:position(text,m.index)});
    cursor++;
    if (cursor>600) break;
  }
  tips.sort((a,b)=>a.offset-b.offset);
  return {
    stats:{characters:text.length,words:words.length,paragraphs:text.trim()?text.trim().split(/\n\s*\n/).length:0},
    anomalies:[...anomalies,...mixedScripts].sort((a,b)=>a.offset-b.offset),tips,traces,
    disclaimer:'Non è possibile verificare textGrain né stabilire l’origine IA del testo con questo strumento.'
  };
}

export function cleanText(raw) {
  let text=String(raw ?? '');
  text=text.replace(/\r\n?/g,'\n');
  // Solo caratteri di controllo e separatori notoriamente eliminabili.
  // Preserva ZWJ/ZWNJ, caratteri direzionali e combinazioni emoji: richiedono valutazione umana.
  text=text.replace(/[\u200B\u2060\uFEFF\u00AD]/g,'')
    .replace(/[\u00A0\u202F]/g,' ')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g,'');
  return text.normalize('NFC');
}
