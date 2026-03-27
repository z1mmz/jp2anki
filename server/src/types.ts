export type Word = {
  lemma: string;
  surface: string;
  readingHira: string;
};

export type JmdictEntry = {
  expression: string;
  reading?: string;
  glosses: string[];
};
