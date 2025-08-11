// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import Anki from "anki-apkg-export";
import type { Word } from "../types";
import { makeRuby } from "../utils/furigana";

export async function downloadDeck(
  deckName: string,
  words: Word[],
  defs: Record<string, string[]>
) {
  const deck = new Anki(deckName || "JP Deck from Text");
  for (const w of words) {
    const ruby = makeRuby(w.lemma, w.readingHira);
    const glosses = defs[w.lemma]?.length ? defs[w.lemma].join("; ") : "(no definition found)";
    const back = `
      <div><strong>Meaning:</strong> ${glosses}</div>
      <div><strong>Reading:</strong> ${w.readingHira || "(n/a)"}</div>
    `;
    deck.addCard(ruby, back);
  }
  const zip = await deck.save();
  const blob = new Blob([zip], { type: "application/apkg" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "jp_deck.apkg";
  a.click();
  URL.revokeObjectURL(url);
}
