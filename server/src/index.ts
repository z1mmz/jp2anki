import express from "express";
import cors from "cors";
import path from "path";
import { extractWords, dedupe, getTokenizer } from "./tokenizer";
import { lookupLemma, getJmdictIndex } from "./jmdict";
import { buildApkg } from "./anki";
import type { ExtractedWord } from "./anki";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

// Warm up singletons at startup so the first request isn't slow
getTokenizer().catch((err: unknown) => console.error("Tokenizer warmup failed:", err));
getJmdictIndex().catch((err: unknown) => console.error("JMDict warmup failed:", err));

app.post("/api/extract", async (req, res) => {
  try {
    const { text } = req.body as { text?: string };
    if (!text || typeof text !== "string") {
      res.status(400).json({ error: "text is required" });
      return;
    }

    const raw = await extractWords(text);
    const words = dedupe(raw);

    const result: ExtractedWord[] = await Promise.all(
      words.map(async w => {
        const entries = await lookupLemma(w.lemma);
        const best =
          (w.readingHira && entries?.find(e => e.reading === w.readingHira)) ||
          entries?.[0];
        return { ...w, glosses: best?.glosses ?? [] };
      })
    );

    res.json({ words: result });
  } catch (err: unknown) {
    console.error(err);
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.post("/api/deck", async (req, res) => {
  try {
    const { words, deckName } = req.body as {
      words?: ExtractedWord[];
      deckName?: string;
    };
    if (!Array.isArray(words)) {
      res.status(400).json({ error: "words array is required" });
      return;
    }

    const buf = await buildApkg(deckName ?? "JP Deck", words);
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Disposition", 'attachment; filename="jp_deck.apkg"');
    res.send(buf);
  } catch (err: unknown) {
    console.error(err);
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Serve built frontend in production
if (process.env.NODE_ENV === "production") {
  const dist = path.join(process.cwd(), "client/dist");
  app.use(express.static(dist));
  app.get("*", (_req, res) => res.sendFile(path.join(dist, "index.html")));
}

export { app };

if (require.main === module) {
  const PORT = Number(process.env.PORT ?? 3001);
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}
