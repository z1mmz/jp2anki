// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import kuromoji from "kuromoji";
import { toHiragana } from "wanakana";
import type { KuromojiToken, Word } from "../types";

let tokenizerPromise: Promise<kuromoji.Tokenizer<KuromojiToken>> | null = null;

export function getTokenizer() {
  if (tokenizerPromise) return tokenizerPromise;
  tokenizerPromise = new Promise((resolve, reject) => {
    kuromoji.builder({ dicPath: "/kuromoji" }).build((err: Error | null, tokenizer: any) => {
      if (err) reject(err);
      else resolve(tokenizer as unknown as kuromoji.Tokenizer<KuromojiToken>);
    });
  });
  return tokenizerPromise;
}

export async function extractWords(text: string): Promise<Word[]> {
  const tokenizer = await getTokenizer();
  const tokens = tokenizer.tokenize(text) as unknown as KuromojiToken[];

  const content = tokens.filter(
    t => !["記号", "助詞", "助動詞"].includes(String(t.pos))
  );

  return content.map(t => {
    const lemma = t.basic_form && t.basic_form !== "*" ? t.basic_form : t.surface_form;
    const readingHira = t.reading ? toHiragana(t.reading) : "";
    return { lemma, surface: t.surface_form, readingHira };
  });
}

export function dedupe(words: Word[]): Word[] {
  const m = new Map<string, Word>();
  for (const w of words) if (!m.has(w.lemma)) m.set(w.lemma, w);
  return Array.from(m.values()).sort((a, b) => a.lemma.localeCompare(b.lemma));
}
