
// custom types for the jp2anki project
export type KuromojiToken = {
  surface_form: string;
  basic_form: string;      // lemma
  reading?: string | null; // KATAKANA
  pos?: string;
};

export type Word = {
  lemma: string;       // dictionary form (食べる)
  surface: string;     // as appeared in text
  readingHira: string; // furigana (hiragana)
};

export type JmdictEntry = {
  expression: string;  // kanji form
  reading?: string;    // kana reading
  glosses: string[];   // English glosses
};
