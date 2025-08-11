import { unzipSync } from "fflate";
import type { JmdictEntry } from "../types";

let indexPromise: Promise<Map<string, JmdictEntry[]>> | null = null;

async function fetchArrayBuffer(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return await res.arrayBuffer();
}

export async function getJmdictIndex(): Promise<Map<string, JmdictEntry[]>> {
  if (indexPromise) return indexPromise;

  indexPromise = (async () => {
    const buf = await fetchArrayBuffer("/jmdict_english.zip");
    const files = unzipSync(new Uint8Array(buf)); // term_bank_*.json et al.

    const map = new Map<string, JmdictEntry[]>();
    const push = (k: string, e: JmdictEntry) => {
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(e);
    };

    for (const name of Object.keys(files)) {
      if (!/^term_bank_.*\.json$/.test(name)) continue;
      const text = new TextDecoder("utf-8").decode(files[name]);
      const rows = JSON.parse(text) as any[];

      for (const row of rows) {
        const expression = String(row[0] ?? "");
        const reading    = row[1] ? String(row[1]) : undefined;
        const defGroups  = Array.isArray(row[2]) ? row[2] : [];
        const glosses: string[] = [];
        for (const g of defGroups) {
          if (Array.isArray(g)) for (const v of g) if (typeof v === "string") glosses.push(v);
        }
        if (!expression) continue;
        const entry: JmdictEntry = { expression, reading, glosses };
        push(expression, entry);
        if (reading) push(reading, entry); // kana-key for fallback
      }
    }
    return map;
  })();

  return indexPromise;
}

export async function lookupLemma(lemma: string): Promise<JmdictEntry[] | null> {
  const idx = await getJmdictIndex();
  if (idx.has(lemma)) return idx.get(lemma)!;
  const norm = lemma.normalize("NFKC");
  if (idx.has(norm)) return idx.get(norm)!;
  return null;
}
