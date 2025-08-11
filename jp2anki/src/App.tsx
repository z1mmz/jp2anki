import { useEffect, useMemo, useState } from "react";
import TextArea from "./components/TextArea";
import Controls from "./components/Controls";
import WordList from "./components/WordList";
import { extractWords, dedupe } from "./services/tokenizer";
import { lookupLemma } from "./services/jmdict";
import { Word } from "./types";

export default function App() {
  const [text, setText] = useState("");
  const [rawWords, setRawWords] = useState<Word[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [defs, setDefs] = useState<Record<string, string[]>>({});

  const uniqueWords = useMemo(() => dedupe(rawWords), [rawWords]);

  const onExtract = async () => {
    if (!text.trim()) return;
    setBusy(true); setError(null);
    try {
      const words = await extractWords(text);
      setRawWords(words);
    } catch (e: any) {
      setError(String(e.message || e));
    } finally {
      setBusy(false);
    }
  };

  // Enrich definitions after dedupe
  useEffect(() => {
    let cancelled = false;
    if (!uniqueWords.length) { setDefs({}); return; }

    (async () => {
      const out: Record<string, string[]> = {};
      for (const w of uniqueWords) {
        const entries = await lookupLemma(w.lemma);
        if (!entries) { out[w.lemma] = []; continue; }
        // Prefer entry whose reading matches ours if available
        const best = (w.readingHira && entries.find(e => e.reading === w.readingHira)) || entries[0];
        out[w.lemma] = best.glosses?.length ? best.glosses : [];
      }
      if (!cancelled) setDefs(out);
    })();

    return () => { cancelled = true; };
  }, [uniqueWords]);

  const onDownload = async () => {
    const { downloadDeck } = await import("./services/anki");
    await downloadDeck("JP Deck from Text", uniqueWords, defs);
  };

  return (
    <div className="min-h-screen p-6 max-w-4xl mx-auto font-sans">
      <h1 className="text-2xl font-bold mb-4">Japanese → Anki Deck</h1>

      <TextArea value={text} onChange={setText} />
      <Controls
        canExtract={!!text.trim()}
        canDownload={uniqueWords.length > 0}
        busy={busy}
        onExtract={onExtract}
        onDownload={onDownload}
      />

      {error && <div className="text-red-600 mb-3">{error}</div>}
      <WordList words={uniqueWords} defs={defs} />
    </div>
  );
}
