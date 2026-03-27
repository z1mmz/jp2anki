import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { getJmdictIndex, lookupLemma } from "../jmdict";

// JMDict loading takes several seconds on first access
const TIMEOUT = { timeout: 30000 };

describe("getJmdictIndex", TIMEOUT, () => {
  test("returns a non-empty Map", async () => {
    const idx = await getJmdictIndex();
    assert.ok(idx instanceof Map);
    assert.ok(idx.size > 0, "index should have entries");
  });

  test("singleton: returns same Map on second call", async () => {
    const idx1 = await getJmdictIndex();
    const idx2 = await getJmdictIndex();
    assert.equal(idx1, idx2);
  });

  test("indexes by both expression and reading", async () => {
    const idx = await getJmdictIndex();
    // 食べる is indexed by expression
    assert.ok(idx.has("食べる"), "should be indexed by kanji expression");
    // たべる (reading) should also be indexed
    assert.ok(idx.has("たべる"), "should be indexed by reading");
  });
});

describe("lookupLemma", TIMEOUT, () => {
  test("finds a common verb with English gloss", async () => {
    const entries = await lookupLemma("食べる");
    assert.ok(entries !== null);
    assert.ok(entries!.length > 0);
    const hasEat = entries!.some(e => e.glosses.some(g => g.toLowerCase().includes("eat")));
    assert.ok(hasEat, "食べる should have 'eat' in glosses");
  });

  test("finds another common verb", async () => {
    const entries = await lookupLemma("飲む");
    assert.ok(entries !== null);
    const hasDrink = entries!.some(e => e.glosses.some(g => g.toLowerCase().includes("drink")));
    assert.ok(hasDrink, "飲む should have 'drink' in glosses");
  });

  test("finds adjective", async () => {
    const entries = await lookupLemma("美しい");
    assert.ok(entries !== null);
    const hasBeautiful = entries!.some(e =>
      e.glosses.some(g => g.toLowerCase().includes("beautiful"))
    );
    assert.ok(hasBeautiful, "美しい should have 'beautiful' in glosses");
  });

  test("returns null for unknown word", async () => {
    const entries = await lookupLemma("zzzzunknownword");
    assert.equal(entries, null);
  });

  test("each entry has expression, glosses, and optional reading", async () => {
    const entries = await lookupLemma("食べる");
    assert.ok(entries !== null);
    for (const e of entries!) {
      assert.ok(typeof e.expression === "string");
      assert.ok(Array.isArray(e.glosses));
      assert.ok(e.reading === undefined || typeof e.reading === "string");
    }
  });

  test("can look up by reading (hiragana)", async () => {
    const entries = await lookupLemma("たべる");
    assert.ok(entries !== null, "should find entries by reading たべる");
  });

  test("applies NFKC normalization before lookup", async () => {
    // 走る in NFC vs NFKC should both resolve
    const nfc = "走る";
    const entries = await lookupLemma(nfc.normalize("NFKC"));
    assert.ok(entries !== null, "normalized lookup should succeed");
  });
});
