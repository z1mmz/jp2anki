import { useRef, useLayoutEffect } from "react";
import type { ExtractedWord } from "../services/api";
import { makeRuby } from "../utils/furigana";

type Props = {
  word: ExtractedWord;
  sucking: boolean;
  suckDelay: number;
  buttonPos: { x: number; y: number } | null;
};

export default function WordItem({ word, sucking, suckDelay, buttonPos }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (sucking && ref.current && buttonPos) {
      const rect = ref.current.getBoundingClientRect();
      const dx = buttonPos.x - (rect.left + rect.width / 2);
      const dy = buttonPos.y - (rect.top + rect.height / 2);
      ref.current.style.setProperty("--suck-x", `${dx}px`);
      ref.current.style.setProperty("--suck-y", `${dy}px`);
    }
  }, [sucking, buttonPos]);

  return (
    <div
      ref={ref}
      className={`word-card${sucking ? " word-card--sucking" : ""}`}
      style={sucking ? { animationDelay: `${suckDelay}ms` } : undefined}
    >
      <div
        className="word-card__word"
        dangerouslySetInnerHTML={{ __html: makeRuby(word.lemma, word.readingHira) }}
      />
      <div className="word-card__gloss">
        {word.glosses.length ? word.glosses[0] : "—"}
      </div>
    </div>
  );
}
