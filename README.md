# Voci di Cassino – Analisi Testi V2

Webapp statica per GitHub Pages, gratuita, senza registrazione e senza chiavi API. Il testo incollato viene elaborato **localmente nel browser** e non è inviato a servizi di analisi esterni.

## Novità della versione 2

- **Marcatori Unicode**: scansione aggiuntiva dei caratteri zero-width, controlli direzionali, spazi tipografici poco comuni, caratteri di riempimento, selettori di variante e caratteri Unicode TAG.
- **Sequenze concentrate**: distingue alcuni gruppi consecutivi di caratteri invisibili e mostra i codici Unicode individuati. Se esiste un testo nei TAG, lo rende visibile nel rapporto.
- **Meno falsi positivi**: riconosce le normali sequenze di emoji con ZWJ, selettori e bandiere regionali basate su TAG.
- **Giornalismo**: nuova checklist editoriale con attenzione ad attribuzioni, date relative, presunzione di innocenza, fonti e link SegnalaFacile.
- **Pulizia tecnica**: mantiene una versione modificabile da copiare o esportare in `.txt`, senza cambiare volutamente il significato.
- **Aggiornamento offline**: la cache dell'app viene aggiornata alla versione 2.

## Limite fondamentale: watermark statistici

L'app **non rileva né rimuove watermark statistici**, incluso textGrain di OpenAI. Non esiste una verifica affidabile dell'origine IA di un testo basata soltanto su stile, marcatori Unicode o loro assenza. Un segnale Unicode trovato è soltanto un elemento tecnico da controllare: può dipendere da formattazione, lingue o emoji e **non è prova di una filigrana ChatGPT**. Nessun risultato dell'app certifica l'origine umana del testo.

## Come aggiornare il repository già pubblicato

Repository dell'utente: [vocicassino/voci-analisi-testi](https://github.com/vocicassino/voci-analisi-testi).

1. Scarica `voci-analisi-testi-v2.zip` e **estrailo** sul telefono o PC.
2. Apri `https://github.com/vocicassino/voci-analisi-testi` con l'account GitHub che ha i permessi di modifica.
3. Nella branch `main`, apri **Add file → Upload files** (su telefono, se la voce non è visibile, usa la versione desktop del browser).
4. Seleziona i file estratti **dalla cartella interna**, mantenendo i percorsi: `index.html`, `app.js`, `analyzer.mjs`, `marker-audit.mjs`, `styles.css`, `sw.js`, `manifest.webmanifest`, `icon.svg`, `README.md`. La cartella `tests` è facoltativa per il funzionamento pubblico, ma consigliata.
5. Quando GitHub chiede di sovrascrivere file già presenti, accetta per aggiornare la versione precedente, quindi conferma con **Commit changes**. In alternativa aggiorna i singoli file con l'editor GitHub.
6. La pagina pubblica resta `https://vocicassino.github.io/voci-analisi-testi/`. Se l'interfaccia rimane V1, aggiorna la pagina, chiudi e riapri il browser; i vecchi file della PWA potrebbero essere ancora in cache.

**Nota:** se GitHub non permette di caricare file con lo stesso nome nella stessa cartella, utilizza il comando `Edit` per sostituire ciascun file, oppure una procedura `git` locale (`git add . && git commit ... && git push`). Non cancellare l'intero repository.

## Test

Con Node.js 20+:

```bash
node --test tests/*.test.mjs
```

Sono previsti test sia per il vecchio analizzatore sia per il nuovo scanner di marcatori Unicode.

## Privacy

Nessun testo viene salvato in `localStorage` o nella cache del service worker. La cache contiene solo file pubblici dell'applicazione. La copia e l'esportazione sono azioni esplicite dell'utente.
