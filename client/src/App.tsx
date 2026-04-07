import { useState, useRef } from "react";
import { extractWords, downloadDeck } from "./services/api";
import type { ExtractedWord } from "./services/api";
import WordItem from "./components/WordItem";
import "./App.css";

type Phase = "input" | "words" | "sucking";

export default function App() {
  const [text, setText] = useState("");
  const [words, setWords] = useState<ExtractedWord[]>([]);
  const [phase, setPhase] = useState<Phase>("input");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [buttonPos, setButtonPos] = useState<{ x: number; y: number } | null>(null);
  const downloadBtnRef = useRef<HTMLButtonElement>(null);

  const onExtract = async () => {
    if (!text.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const result = await extractWords(text);
      setWords(result);
      setPhase("words");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const onDownload = async () => {
    if (!downloadBtnRef.current || phase === "sucking") return;
    const rect = downloadBtnRef.current.getBoundingClientRect();
    setButtonPos({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
    setPhase("sucking");

    const animDuration = 55 + words.length * 40 + 550;
    setTimeout(async () => {
      try {
        await downloadDeck(words);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setPhase("words");
        setButtonPos(null);
      }
    }, animDuration);
  };

  const isWords = phase === "words" || phase === "sucking";

  return (
    <div className={`app${isWords ? " app--split" : ""}`}>
      <div className={`input-panel${isWords ? " input-panel--collapsed" : ""}`}>
        {!isWords && <h1 className="app-title">Japanese → Anki</h1>}
        {isWords && <span className="panel-label">Input</span>}
        <textarea
          className="main-textarea"
          placeholder="Paste Japanese text here…"
          value={text}
          onChange={e => setText(e.target.value)}
          readOnly={isWords}
        />
        {!isWords && (
          <button
            className="btn-extract"
            onClick={onExtract}
            disabled={!text.trim() || busy}
          >
            {busy ? "Analysing…" : "Extract words →"}
          </button>
        )}
        {error && <p className="error-msg">{error}</p>}
      </div>

      {isWords && (
        <div className="cards-panel">
          <div className="cards-grid">
            {words.map((w, i) => (
              <WordItem
                key={w.lemma}
                word={w}
                sucking={phase === "sucking"}
                suckDelay={i * 40}
                buttonPos={buttonPos}
              />
            ))}
          </div>
          <div className="bottom-bar">
            <button
              ref={downloadBtnRef}
              className="btn-download"
              onClick={onDownload}
              disabled={phase === "sucking"}
            >
              {phase === "sucking" ? "Creating…" : "Create Anki Deck"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
