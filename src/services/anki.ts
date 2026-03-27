// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { Deck, Model, Note, Package } from "genanki-js";
import type { Word } from "../types";
import { makeRuby } from "../utils/furigana";

// A stable 32-bit ID is required by Anki; use any fixed integers for model/deck.
const MODEL_ID = 1607392319;
const DECK_ID  = 2059400110;

export async function downloadDeck(
  deckName: string,
  words: Word[],
  defs: Record<string, string[]>
) {
  // Basic note type with two fields
  const model = new Model({
    name: "Basic",
    id: MODEL_ID,
    flds: [{ name: "Front" }, { name: "Back" }],
    tmpls: [
      {
        name: "Card 1",
        qfmt: "{{Front}}",
        afmt: "{{FrontSide}}<hr id=answer>{{Back}}",
      },
    ],
    // (Optional) add CSS here if you want nicer ruby styling
  });

  const deck = new Deck(DECK_ID, deckName || "JP Deck from Text");

  for (const w of words) {
    const front = makeRuby(w.lemma, w.readingHira);
    const glosses = defs[w.lemma]?.length ? defs[w.lemma].join("; ") : "(no definition found)";
    const back = `
      <div><strong>Meaning:</strong> ${glosses}</div>
      <div><strong>Reading:</strong> ${w.readingHira || "(n/a)"}</div>
    `;
    deck.addNote(new Note(model, [front, back]));
  }

  const pkg = new Package();
  pkg.addDeck(deck);

  // genanki-js writes to a Blob in browsers
  const blob = await pkg.writeToBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "jp_deck.apkg";
  a.click();
  URL.revokeObjectURL(url);
}
