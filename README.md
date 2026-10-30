# Voci di Cassino — Analisi Testi

Webapp statica per GitHub Pages. Senza API, senza registrazione, senza invio del testo a server esterni.

## Cosa può fare

- Evidenziare caratteri invisibili o non stampabili, spazi non separabili e controlli Unicode direzionali.
- Segnalare lettere latine mischiate a caratteri cirillici/greci nella stessa parola.
- Segnalare residui di formato (Markdown, marcature di citazione) e frasi di accompagnamento eventualmente rimaste dal dialogo.
- Proporre revisioni editoriali per espressioni convenzionali, ripetizioni e frasi eccessivamente lunghe.
- Ripulire in modo conservativo soltanto i caratteri tecnici eliminabili senza cambiare il significato del testo; alcuni caratteri vengono volutamente lasciati intatti (per esempio ZWJ nelle emoji).
- Consentire copia o esportazione del risultato modificato in `.txt`.
- Funzionare offline dopo una prima visita su HTTPS, con una cache dei soli file dell'applicazione.

## Limiti fondamentali

**NON rileva e NON rimuove watermark statistici come textGrain.** Non è un classificatore di origine IA, non può stabilire l'autore di un testo e non fornisce una certificazione «testo non riconoscibile come IA». Gli indizi stilistici sono comuni anche in testi scritti da persone. Nessuna pulizia di caratteri Unicode garantisce l'assenza di un segnale di provenienza.

Fonti: [OpenAI, 5 ottobre 2026](https://openai.com/it-IT/index/eu-text-provenance/) e [OpenAI Help Center](https://help.openai.com/it-it/articles/8912793-provenance-signals-in-openai-generated-content).

## Pubblicazione su GitHub Pages

1. Crea un nuovo repository su [GitHub](https://github.com/new), per esempio `voci-analisi-testi`, impostato su **Public**.
2. Carica **tutti i file** contenuti nello ZIP direttamente nella cartella principale del repository (non caricare lo ZIP come file unico).
3. Apri **Settings → Pages**, in «Build and deployment» scegli **Deploy from a branch** e la branch `main`, cartella **/(root)**; salva.
4. L'app sarà disponibile all'indirizzo `https://TUO-USERNAME.github.io/voci-analisi-testi/` quando GitHub Pages avrà concluso la pubblicazione. Copia l'URL indicato dalla schermata Pages, senza indovinarlo.
5. Da Chrome Android scegli **Aggiungi a schermata Home** per aprirla come app.

Lo stesso progetto può essere distribuito tramite qualsiasi host statico. GitHub Pages è un hosting pubblico per il codice sorgente: non caricare dati riservati nei file del repository.

## Prove locali

Puoi aprire `index.html` con un piccolo server statico, per esempio `python3 -m http.server 8000` e poi `http://localhost:8000/`.

Esegui i test dell'analizzatore con Node.js: `node --test tests/analyzer.test.mjs`.

## Privacy

Le parole incollate nel riquadro non vengono spedite, conservate in `localStorage` o scritte nella cache del service worker. La copia del testo e il download sono azioni esplicite dell'utente.
