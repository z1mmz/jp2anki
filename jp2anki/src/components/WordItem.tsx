import React from "react";
import type { Word } from "../types";
import { makeRuby } from "../utils/furigana";

type Props = {
  word: Word;
  glosses?: string[];
};

export default function WordItem({ word, glosses }: Props) {
  return (
    <div className="p-2 border rounded">
      <div dangerouslySetInnerHTML={{ __html: makeRuby(word.lemma, word.readingHira) }} />
      <div className="text-sm text-gray-700">
        {glosses?.length ? glosses.join("; ") : "—"}
      </div>
    </div>
  );
}
