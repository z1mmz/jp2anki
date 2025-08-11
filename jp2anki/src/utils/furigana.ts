// Utility functions for handling furigana in Japanese text
export function makeRuby(kanjiOrKana: string, readingHira: string) {
  if (!readingHira) return kanjiOrKana;
  return `<ruby>${kanjiOrKana}<rt>${readingHira}</rt></ruby>`;
}