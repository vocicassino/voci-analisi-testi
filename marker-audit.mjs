/**
 * Ispezione di anomalie Unicode note, locali al dispositivo.
 * Questi segnali non dimostrano e non escludono l'uso di IA.
 * In particolare textGrain è statistico e NON è rilevabile da questo modulo.
 */
const glyphCode = cp => 'U+' + cp.toString(16).toUpperCase().padStart(cp > 0xFFFF ? 6 : 4, '0');
const lineAt = (text, i) => 1 + (text.slice(0, i).match(/\n/g) || []).length;
const contextAt = (text, i, length = 1) => text.slice(Math.max(0, i - 22), Math.min(text.length, i + length + 22)).replace(/\n/g, ' ↵ ');
const ZERO_WIDTH = new Set([0x00AD, 0x034F, 0x061C, 0x180E, 0x200B, 0x200C, 0x200D, 0x200E, 0x200F, 0x2060, 0x2061, 0x2062, 0x2063, 0x2064, 0xFEFF]);
const UNUSUAL_SPACES = new Set([0x1680, 0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005, 0x2006, 0x2007, 0x2008, 0x2009, 0x200A, 0x202F, 0x205F, 0x3000]);
const FILLERS = new Set([0x115F, 0x1160, 0x17B4, 0x17B5, 0x2800, 0x3164, 0xFFA0]);
const emoji = /\p{Extended_Pictographic}/u;
const validTextVS = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u;
function isVS(cp) { return (cp >= 0xFE00 && cp <= 0xFE0F) || (cp >= 0xE0100 && cp <= 0xE01EF); }
function isTAG(cp) { return cp >= 0xE0000 && cp <= 0xE007F; }
function isBidi(cp) { return (cp >= 0x202A && cp <= 0x202E) || (cp >= 0x2066 && cp <= 0x2069); }
function readable(value) {
  return [...value].map(ch => ch.codePointAt(0)).map(glyphCode).join(' ');
}
export function inspectMarkers(raw) {
  const text = String(raw ?? '');
  const markers = [];
  const sequences = [];
  const kinds = {invisibili:0, selettori:0, tag:0, spazi:0, riempitivi:0};
  const add = (offset, code, label, kind, note, length) => {
    markers.push({id:'w'+offset,offset,code:glyphCode(code),label,kind,note,line:lineAt(text,offset),excerpt:contextAt(text,offset,length),length});
    kinds[kind]++;
  };
  // I TAG di una emoji di bandiera regionale non sono un messaggio nascosto
  // in prosa: li escludiamo dalla lista, senza trarre conclusioni sull'origine.
  const legitimateTags=[];
  for(const m of text.matchAll(/\u{1F3F4}[\u{E0061}-\u{E007A}]{2,10}\u{E007F}/gu)) {
    legitimateTags.push([m.index+2,m.index+m[0].length]);
  }
  const isLegitimateTag = offset => legitimateTags.some(([from,to])=>offset>=from && offset<to);
  let preceding='';
  const run = [];
  const flush = () => {
    if (run.length >= 3 && sequences.length < 40) {
      const first = run[0];
      sequences.push({offset:first.offset,line:lineAt(text,first.offset),label:'Sequenza concentrata di caratteri invisibili',
        detail:`${run.length} caratteri consecutivi, codici: ${run.slice(0,12).map(x=>glyphCode(x.code)).join(' ')}${run.length>12?'…':''}. Può dipendere da formattazione o da codifiche intenzionali; non prova un watermark IA.`,
        length:(run[run.length-1].offset+run[run.length-1].length)-first.offset});
    }
    run.length=0;
  };
  for(let i=0;i<text.length;) {
    const cp=text.codePointAt(i),ch=String.fromCodePoint(cp),size=ch.length;
    const following=text.codePointAt(i+size);
    const next=following===undefined?'':String.fromCodePoint(following);
    const normalEmojiJoin=cp===0x200D && (emoji.test(next) || emoji.test(preceding));
    const normalEmojiVS=(cp===0xFE0E || cp===0xFE0F) && (emoji.test(preceding) || emoji.test(next) || (/[0-9#*]/.test(preceding) && next==='\u20E3'));
    const legitimateEmojiTag=isTAG(cp) && isLegitimateTag(i);
    // Selector 1-16 in CJK can be a legitimate glyph variant. Still inspect with a note.
    if(isTAG(cp) && !legitimateEmojiTag) add(i,cp,'Carattere Unicode TAG', 'tag','I caratteri TAG possono trasportare testo invisibile; alcuni sono usati legittimamente nelle emoji delle bandiere regionali.',size);
    else if(isVS(cp) && !normalEmojiVS) {
      add(i,cp,'Selettore di variante Unicode','selettori',validTextVS.test(preceding)?'Può indicare una variante tipografica legittima (CJK); valuta il contesto.':'Selettore insolito in questa posizione; può essere codifica testuale nascosta ma non dimostra un watermark IA.',size);
    }
    else if(FILLERS.has(cp)) add(i,cp,'Carattere di riempimento simile a uno spazio','riempitivi','Potrebbe apparire come uno spazio pur non essendolo. Può anche appartenere a una scrittura non latina.',size);
    else if(UNUSUAL_SPACES.has(cp)) add(i,cp,'Spazio Unicode non ordinario','spazi','Può derivare dall’impaginazione; da solo non è sospetto.',size);
    else if((ZERO_WIDTH.has(cp) || isBidi(cp)) && !normalEmojiJoin) add(i,cp,'Carattere invisibile / direzionale','invisibili','Possibile controllo di formattazione, direzionalità o separazione. Non è attribuibile a ChatGPT.',size);
    const potentialHidden=(ZERO_WIDTH.has(cp) && !normalEmojiJoin) || (isTAG(cp) && !legitimateEmojiTag) || (isVS(cp) && !normalEmojiVS);
    if(potentialHidden) run.push({offset:i,code:cp,length:size}); else flush();
    preceding=ch;
    i+=size;
  }
  flush();
  // Evidenzia i TAG con payload ASCII leggibile, senza dedurre la sua origine.
  const tagRuns=[...text.matchAll(/[\u{E0020}-\u{E007E}]+/gu)].filter(m=>!isLegitimateTag(m.index));
  for(const m of tagRuns.slice(0,25)) {
    if (m[0].length < 2) continue;
    const payload=[...m[0]].map(ch=>String.fromCharCode(ch.codePointAt(0)-0xE0000)).join('');
    sequences.push({offset:m.index,line:lineAt(text,m.index),label:'Payload codificato con Unicode TAG',
      detail:`Contenuto TAG leggibile: «${payload.slice(0,80)}». La sequenza potrebbe appartenere a una emoji di bandiera; valutare il contesto.`,length:m[0].length});
  }
  const total=markers.length;
  return {
    markers,sequences,kinds,total,
    conclusion:total
      ?`Trovati ${total} caratteri/segni Unicode da controllare. Nessuno è prova della presenza di un watermark ChatGPT.`
      :'Nessuno dei marcatori Unicode monitorati è stato trovato. Questo NON esclude filigrane statistiche o altri segnali non osservabili.',
    statisticalWatermark:'Non verificabile: serve il rilevatore specifico con chiave e impostazioni compatibili.'
  };
}

export function journalismReview(raw) {
  const text=String(raw ?? '');
  const items=[];
  const add=(title,detail,severity='consiglio')=>items.push({title,detail,severity});
  const words=[...text.matchAll(/[\p{L}\p{M}]+/gu)].length;
  if(words<90) add('Contenuto breve','Per articoli brevi verifica che il lettore possa capire chi, cosa, dove, quando e da quale fonte deriva l’informazione.');
  if(/\b(?:si dice|si vocifera|secondo indiscrezioni|pare che|si mormora|fonti non meglio precisate)\b/iu.test(text))
    add('Attribuzione da precisare','Sono presenti formule che richiedono una fonte, una data o una specifica sull’incertezza. Non presentare ipotesi come fatti.','attenzione');
  if(/\b(?:colpevole|responsabile|truffatore|criminale)\b/iu.test(text))
    add('Presunzione di innocenza','Verifica se il contesto giustifica queste parole: distinguere contestazioni, indagini, processi e sentenze definitive.','attenzione');
  if(/\b(?:oggi|ieri|domani|nelle ultime ore|in questi giorni)\b/iu.test(text))
    add('Riferimenti temporali','Verifica i riferimenti relativi alla data di pubblicazione e, dove serve, aggiungi una data esplicita.');
  if(!/https?:\/\/\S+/u.test(text) && words>140)
    add('Fonti consultabili','Se l’articolo riferisce notizie ricavate da documenti o comunicazioni pubbliche, valuta di aggiungere riferimenti verificabili. Non inventare link o citazioni.');
  if(!text.includes('https://vocicassino.github.io/segnalafacile/'))
    add('SegnalaFacile','Per un articolo destinato a Voci di Cassino, valuta di aggiungere nel finale il link alle segnalazioni: https://vocicassino.github.io/segnalafacile/');
  add('Controllo prima della pubblicazione','Controlla che titoli, citazioni, date, cifre, identità e immagini siano coerenti con le fonti. La revisione automatica non sostituisce la verifica umana.');
  return items;
}
