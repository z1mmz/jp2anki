import React from "react";
import type { Word } from "../types";
import WordItem from "./WordItem";

type Props = {
  words: Word[];
  defs: Record<string, string[]>;
};

export default function WordList({ words, defs }: Props) {
  if (!words.length) return null;
  return (
    <div className="space-y-2">
      {words.map(w => (
        <WordItem key={w.lemma} word={w} glosses={defs[w.lemma]} />
      ))}
    </div>
  );
}
