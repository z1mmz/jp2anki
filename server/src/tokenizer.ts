// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import kuromoji from "kuromoji";
import { toHiragana } from "wanakana";
import path from "path";
import type { Word } from "./types";

interface KuromojiToken {
  surface_form: string;
  basic_form: string;
  reading?: string | null;
  pos?: string;
  pos_detail_1?: string;
}

let tokenizerPromise: Promise<kuromoji.Tokenizer<KuromojiToken>> | null = null;

export function getTokenizer(): Promise<kuromoji.Tokenizer<KuromojiToken>> {
  if (tokenizerPromise) return tokenizerPromise;
  const dicPath = path.join(path.dirname(require.resolve("kuromoji/package.json")), "dict");
  tokenizerPromise = new Promise((resolve, reject) => {
    kuromoji.builder({ dicPath }).build((err: Error | null, tokenizer: unknown) => {
      if (err) reject(err);
      else resolve(tokenizer as unknown as kuromoji.Tokenizer<KuromojiToken>);
    });
  });
  return tokenizerPromise;
}

// Matches any hiragana, katakana, or kanji character
const JAPANESE_RE = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\u3400-\u4DBF]/;

function isJapanese(word: string): boolean {
  return JAPANESE_RE.test(word);
}

export async function extractWords(text: string): Promise<Word[]> {
  const tokenizer = await getTokenizer();
  const tokens = tokenizer.tokenize(text) as unknown as KuromojiToken[];

  const STOP_POS = new Set(["記号", "助詞", "助動詞", "接続詞", "感動詞", "連体詞"]);
  const STOP_NOUN_D1 = new Set(["非自立", "数", "接尾"]);

  const content = tokens.filter(t => {
    const pos = String(t.pos);
    if (STOP_POS.has(pos)) return false;
    const d1 = String(t.pos_detail_1 ?? "");
    if (pos === "名詞" && STOP_NOUN_D1.has(d1)) return false;
    if (pos === "動詞" && d1 === "非自立") return false;
    return true;
  });

  return content
    .map(t => {
      const lemma = t.basic_form && t.basic_form !== "*" ? t.basic_form : t.surface_form;
      const readingHira = (t.reading && t.reading !== "*") ? toHiragana(t.reading) : "";
      return { lemma, surface: t.surface_form, readingHira };
    })
    .filter(w => isJapanese(w.lemma));
}

export function dedupe(words: Word[]): Word[] {
  const m = new Map<string, Word>();
  for (const w of words) if (!m.has(w.lemma)) m.set(w.lemma, w);
  return Array.from(m.values()).sort((a, b) => a.lemma.localeCompare(b.lemma));
}
