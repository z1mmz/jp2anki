export interface ExtractedWord {
  lemma: string;
  surface: string;
  readingHira: string;
  glosses: string[];
}

export async function extractWords(text: string): Promise<ExtractedWord[]> {
  const res = await fetch("/api/extract", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText })) as { error?: string };
    throw new Error(err.error ?? res.statusText);
  }
  const data = await res.json() as { words: ExtractedWord[] };
  return data.words;
}

export async function downloadDeck(words: ExtractedWord[], deckName?: string): Promise<void> {
  const res = await fetch("/api/deck", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ words, deckName }),
  });
  if (!res.ok) throw new Error("Deck generation failed");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "jp_deck.apkg";
  a.click();
  URL.revokeObjectURL(url);
}
