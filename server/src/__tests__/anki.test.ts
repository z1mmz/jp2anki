import { describe, test } from "node:test";
import assert from "node:assert/strict";
import JSZip from "jszip";
import initSqlJs from "sql.js";
import { buildApkg } from "../anki";
import type { ExtractedWord } from "../anki";

const SAMPLE_WORDS: ExtractedWord[] = [
  { lemma: "食べる", surface: "食べる", readingHira: "たべる", glosses: ["to eat"] },
  { lemma: "飲む", surface: "飲む", readingHira: "のむ", glosses: ["to drink", "to swallow"] },
];

describe("buildApkg", () => {
  test("returns a Buffer", async () => {
    const buf = await buildApkg("Test Deck", SAMPLE_WORDS);
    assert.ok(Buffer.isBuffer(buf));
    assert.ok(buf.length > 0);
  });

  test("generates a valid zip containing collection.anki2 and media", async () => {
    const buf = await buildApkg("Test Deck", SAMPLE_WORDS);
    const zip = await JSZip.loadAsync(buf);
    assert.ok("collection.anki2" in zip.files, "missing collection.anki2");
    assert.ok("media" in zip.files, "missing media file");
  });

  test("media file is an empty JSON object", async () => {
    const buf = await buildApkg("Test Deck", SAMPLE_WORDS);
    const zip = await JSZip.loadAsync(buf);
    const media = await zip.files["media"].async("text");
    assert.equal(media, "{}");
  });

  test("collection.anki2 starts with SQLite magic bytes", async () => {
    const buf = await buildApkg("Test Deck", SAMPLE_WORDS);
    const zip = await JSZip.loadAsync(buf);
    const dbBuf = await zip.files["collection.anki2"].async("nodebuffer");
    const magic = dbBuf.slice(0, 16).toString("utf8");
    assert.ok(magic.startsWith("SQLite format 3"), `unexpected header: ${magic}`);
  });

  test("database contains one note per word", async () => {
    const buf = await buildApkg("Test Deck", SAMPLE_WORDS);
    const zip = await JSZip.loadAsync(buf);
    const dbBuf = await zip.files["collection.anki2"].async("nodebuffer");

    const SQL = await initSqlJs();
    const db = new SQL.Database(dbBuf);
    const result = db.exec("SELECT COUNT(*) FROM notes");
    const count = result[0].values[0][0] as number;
    db.close();

    assert.equal(count, SAMPLE_WORDS.length);
  });

  test("database contains one card per word", async () => {
    const buf = await buildApkg("Test Deck", SAMPLE_WORDS);
    const zip = await JSZip.loadAsync(buf);
    const dbBuf = await zip.files["collection.anki2"].async("nodebuffer");

    const SQL = await initSqlJs();
    const db = new SQL.Database(dbBuf);
    const result = db.exec("SELECT COUNT(*) FROM cards");
    const count = result[0].values[0][0] as number;
    db.close();

    assert.equal(count, SAMPLE_WORDS.length);
  });

  test("note front contains the word (with or without ruby)", async () => {
    const buf = await buildApkg("Test Deck", [SAMPLE_WORDS[0]]);
    const zip = await JSZip.loadAsync(buf);
    const dbBuf = await zip.files["collection.anki2"].async("nodebuffer");

    const SQL = await initSqlJs();
    const db = new SQL.Database(dbBuf);
    const result = db.exec("SELECT flds FROM notes");
    const flds = result[0].values[0][0] as string;
    db.close();

    assert.ok(flds.includes("食べる"), "front field should contain the word");
  });

  test("note back contains the gloss", async () => {
    const buf = await buildApkg("Test Deck", [SAMPLE_WORDS[0]]);
    const zip = await JSZip.loadAsync(buf);
    const dbBuf = await zip.files["collection.anki2"].async("nodebuffer");

    const SQL = await initSqlJs();
    const db = new SQL.Database(dbBuf);
    const result = db.exec("SELECT flds FROM notes");
    const flds = result[0].values[0][0] as string;
    db.close();

    assert.ok(flds.includes("to eat"), "back field should contain the gloss");
  });

  test("front uses ruby annotation when reading is provided", async () => {
    const buf = await buildApkg("Test Deck", [SAMPLE_WORDS[0]]);
    const zip = await JSZip.loadAsync(buf);
    const dbBuf = await zip.files["collection.anki2"].async("nodebuffer");

    const SQL = await initSqlJs();
    const db = new SQL.Database(dbBuf);
    const result = db.exec("SELECT flds FROM notes");
    const flds = result[0].values[0][0] as string;
    db.close();

    assert.ok(flds.includes("<ruby>"), "front should have ruby tag when reading exists");
    assert.ok(flds.includes("<rt>たべる</rt>"), "front should include hiragana reading");
  });

  test("no reading: front shows plain word without ruby", async () => {
    const noReading: ExtractedWord = { lemma: "test", surface: "test", readingHira: "", glosses: ["test"] };
    const buf = await buildApkg("Test Deck", [noReading]);
    const zip = await JSZip.loadAsync(buf);
    const dbBuf = await zip.files["collection.anki2"].async("nodebuffer");

    const SQL = await initSqlJs();
    const db = new SQL.Database(dbBuf);
    const result = db.exec("SELECT flds FROM notes");
    const flds = result[0].values[0][0] as string;
    db.close();

    assert.ok(!flds.includes("<ruby>"), "should not have ruby tag without reading");
  });

  test("empty word list produces valid apkg with zero notes", async () => {
    const buf = await buildApkg("Empty Deck", []);
    const zip = await JSZip.loadAsync(buf);
    const dbBuf = await zip.files["collection.anki2"].async("nodebuffer");

    const SQL = await initSqlJs();
    const db = new SQL.Database(dbBuf);
    const result = db.exec("SELECT COUNT(*) FROM notes");
    const count = result[0].values[0][0] as number;
    db.close();

    assert.equal(count, 0);
  });

  test("multiple glosses are joined with semicolons in back", async () => {
    const buf = await buildApkg("Test Deck", [SAMPLE_WORDS[1]]); // 飲む has 2 glosses
    const zip = await JSZip.loadAsync(buf);
    const dbBuf = await zip.files["collection.anki2"].async("nodebuffer");

    const SQL = await initSqlJs();
    const db = new SQL.Database(dbBuf);
    const result = db.exec("SELECT flds FROM notes");
    const flds = result[0].values[0][0] as string;
    db.close();

    assert.ok(flds.includes("to drink; to swallow"), "multiple glosses should be joined by '; '");
  });

  test("words with no glosses show fallback text", async () => {
    const noGloss: ExtractedWord = { lemma: "謎語", surface: "謎語", readingHira: "なぞご", glosses: [] };
    const buf = await buildApkg("Test Deck", [noGloss]);
    const zip = await JSZip.loadAsync(buf);
    const dbBuf = await zip.files["collection.anki2"].async("nodebuffer");

    const SQL = await initSqlJs();
    const db = new SQL.Database(dbBuf);
    const result = db.exec("SELECT flds FROM notes");
    const flds = result[0].values[0][0] as string;
    db.close();

    assert.ok(flds.includes("no definition found"), "should show fallback when no glosses");
  });
});
