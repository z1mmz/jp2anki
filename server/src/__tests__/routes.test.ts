import { describe, test } from "node:test";
import assert from "node:assert/strict";
import supertest from "supertest";
import JSZip from "jszip";
import { app } from "../index";

const request = supertest(app);

// Routes wait on kuromoji + JMDict singletons; allow generous timeout
const TIMEOUT = { timeout: 60000 };

describe("POST /api/extract", TIMEOUT, () => {
  test("returns 400 when body has no text field", async () => {
    const res = await request.post("/api/extract").send({});
    assert.equal(res.status, 400);
    assert.ok(typeof res.body.error === "string");
  });

  test("returns 400 when text is not a string", async () => {
    const res = await request.post("/api/extract").send({ text: 123 });
    assert.equal(res.status, 400);
  });

  test("returns 200 with words array for valid Japanese text", async () => {
    const res = await request
      .post("/api/extract")
      .send({ text: "食べる飲む" });
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.words));
    assert.ok(res.body.words.length > 0);
  });

  test("each word has lemma, surface, readingHira, and glosses", async () => {
    const res = await request
      .post("/api/extract")
      .send({ text: "食べる" });
    assert.equal(res.status, 200);
    for (const w of res.body.words) {
      assert.ok(typeof w.lemma === "string", "lemma must be string");
      assert.ok(typeof w.surface === "string", "surface must be string");
      assert.ok(typeof w.readingHira === "string", "readingHira must be string");
      assert.ok(Array.isArray(w.glosses), "glosses must be array");
    }
  });

  test("deduplicates repeated words", async () => {
    const res = await request
      .post("/api/extract")
      .send({ text: "食べる食べる食べる" });
    assert.equal(res.status, 200);
    const lemmas = res.body.words.map((w: { lemma: string }) => w.lemma);
    const unique = new Set(lemmas);
    assert.equal(unique.size, lemmas.length, "no duplicate lemmas");
  });

  test("glosses include English definitions for common verbs", async () => {
    const res = await request
      .post("/api/extract")
      .send({ text: "食べる" });
    assert.equal(res.status, 200);
    const taberu = res.body.words.find((w: { lemma: string }) => w.lemma === "食べる");
    assert.ok(taberu, "should include 食べる");
    assert.ok(
      taberu.glosses.some((g: string) => g.toLowerCase().includes("eat")),
      "gloss should mention 'eat'"
    );
  });

  test("filters out particles and punctuation", async () => {
    const res = await request
      .post("/api/extract")
      .send({ text: "私は食べる。" });
    assert.equal(res.status, 200);
    const lemmas = res.body.words.map((w: { lemma: string }) => w.lemma);
    assert.ok(!lemmas.includes("は"), "particle は should be filtered");
    assert.ok(!lemmas.includes("。"), "punctuation should be filtered");
  });
});

describe("POST /api/deck", TIMEOUT, () => {
  const sampleWords = [
    { lemma: "食べる", surface: "食べる", readingHira: "たべる", glosses: ["to eat"] },
    { lemma: "飲む", surface: "飲む", readingHira: "のむ", glosses: ["to drink"] },
  ];

  test("returns 400 when words field is missing", async () => {
    const res = await request.post("/api/deck").send({});
    assert.equal(res.status, 400);
  });

  test("returns 400 when words is not an array", async () => {
    const res = await request.post("/api/deck").send({ words: "not an array" });
    assert.equal(res.status, 400);
  });

  test("returns 200 with octet-stream content type", async () => {
    const res = await request
      .post("/api/deck")
      .send({ words: sampleWords })
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => callback(null, Buffer.concat(chunks)));
      });
    assert.equal(res.status, 200);
    assert.ok(
      res.headers["content-type"]?.includes("application/octet-stream"),
      "should return octet-stream"
    );
  });

  test("response body is a valid zip file containing collection.anki2", async () => {
    const res = await request
      .post("/api/deck")
      .send({ words: sampleWords })
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => callback(null, Buffer.concat(chunks)));
      });
    assert.equal(res.status, 200);
    const zip = await JSZip.loadAsync(res.body as Buffer);
    assert.ok("collection.anki2" in zip.files, "must contain collection.anki2");
    assert.ok("media" in zip.files, "must contain media");
  });

  test("uses provided deckName", async () => {
    // Just verifies no error occurs with a custom name (name is stored in the SQLite col table)
    const res = await request
      .post("/api/deck")
      .send({ words: sampleWords, deckName: "My Custom Deck" });
    assert.equal(res.status, 200);
  });

  test("accepts empty words array and returns valid apkg", async () => {
    const res = await request
      .post("/api/deck")
      .send({ words: [] })
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => callback(null, Buffer.concat(chunks)));
      });
    assert.equal(res.status, 200);
    const zip = await JSZip.loadAsync(res.body as Buffer);
    assert.ok("collection.anki2" in zip.files);
  });
});
