import { unzipSync } from "fflate";
import fs from "fs";
import path from "path";
import type { JmdictEntry } from "./types";

function extractText(content: unknown): string[] {
  if (typeof content === "string") return content ? [content] : [];
  if (Array.isArray(content)) return content.flatMap(extractText);
  if (content && typeof content === "object") {
    const obj = content as Record<string, unknown>;
    if (obj.content !== undefined) return extractText(obj.content);
  }
  return [];
}

let indexPromise: Promise<Map<string, JmdictEntry[]>> | null = null;

export function getJmdictIndex(): Promise<Map<string, JmdictEntry[]>> {
  if (indexPromise) return indexPromise;

  indexPromise = (async () => {
    const zipPath = path.join(process.cwd(), "data/jmdict_english.zip");
    const buf = fs.readFileSync(zipPath);
    const files = unzipSync(new Uint8Array(buf));

    const map = new Map<string, JmdictEntry[]>();
    const push = (k: string, e: JmdictEntry) => {
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(e);
    };

    for (const name of Object.keys(files)) {
      if (!/^term_bank_.*\.json$/.test(name)) continue;
      const text = new TextDecoder("utf-8").decode(files[name]);
      const rows = JSON.parse(text) as unknown[];

      for (const row of rows) {
        if (!Array.isArray(row)) continue;
        const expression = String(row[0] ?? "");
        const reading    = row[1] ? String(row[1]) : undefined;
        // row[5] is the glosses array (structured-content or plain strings)
        const rawGlosses = Array.isArray(row[5]) ? row[5] : [];
        const glosses: string[] = rawGlosses.flatMap((g: unknown) => {
          if (typeof g === "string") return [g];
          if (g && typeof g === "object") {
            const obj = g as Record<string, unknown>;
            if (obj.type === "structured-content") return extractText(obj.content);
          }
          return [];
        });
        if (!expression) continue;
        const entry: JmdictEntry = { expression, reading, glosses };
        push(expression, entry);
        if (reading) push(reading, entry);
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
