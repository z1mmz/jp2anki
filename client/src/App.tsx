import { useState } from "react";
import TextArea from "./components/TextArea";
import Controls from "./components/Controls";
import WordList from "./components/WordList";
import { extractWords, downloadDeck } from "./services/api";
import type { ExtractedWord } from "./services/api";

export default function App() {
  const [text, setText] = useState("");
  const [words, setWords] = useState<ExtractedWord[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onExtract = async () => {
    if (!text.trim()) return;
    setBusy(true);
    setError(null);
    try {
      setWords(await extractWords(text));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const onDownload = async () => {
    setBusy(true);
    try {
      await downloadDeck(words);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  // Build defs map for WordList (glosses are already on each word)
  const defs: Record<string, string[]> = {};
  for (const w of words) defs[w.lemma] = w.glosses;

  return (
    <div className="min-h-screen flex flex-col items-center px-6 py-10 font-sans">
      <div className="w-full max-w-2xl">
        <h1 className="text-2xl font-bold mb-6">Japanese → Anki Deck</h1>

        <TextArea value={text} onChange={setText} />
        <Controls
          canExtract={!!text.trim()}
          canDownload={words.length > 0}
          busy={busy}
          onExtract={onExtract}
          onDownload={onDownload}
        />

        {error && <div className="text-red-600 mb-3">{error}</div>}
        <WordList words={words} defs={defs} />
      </div>
    </div>
  );
}
