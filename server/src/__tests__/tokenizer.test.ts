import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { dedupe, extractWords } from "../tokenizer";
import type { Word } from "../types";

describe("dedupe", () => {
  test("removes duplicate lemmas, keeping first occurrence", () => {
    const words: Word[] = [
      { lemma: "食べる", surface: "食べ", readingHira: "たべ" },
      { lemma: "食べる", surface: "食べる", readingHira: "たべる" },
      { lemma: "飲む", surface: "飲む", readingHira: "のむ" },
    ];
    const result = dedupe(words);
    assert.equal(result.length, 2);
    const taberu = result.find(w => w.lemma === "食べる");
    assert.equal(taberu?.surface, "食べ"); // first occurrence kept
  });

  test("sorts results alphabetically by lemma", () => {
    const words: Word[] = [
      { lemma: "飲む", surface: "飲む", readingHira: "のむ" },
      { lemma: "食べる", surface: "食べる", readingHira: "たべる" },
      { lemma: "走る", surface: "走る", readingHira: "はしる" },
    ];
    const result = dedupe(words);
    const lemmas = result.map(w => w.lemma);
    assert.deepEqual(lemmas, [...lemmas].sort((a, b) => a.localeCompare(b)));
  });

  test("handles empty array", () => {
    assert.deepEqual(dedupe([]), []);
  });

  test("handles single element", () => {
    const words: Word[] = [{ lemma: "食べる", surface: "食べる", readingHira: "たべる" }];
    assert.deepEqual(dedupe(words), words);
  });
});

describe("extractWords", { timeout: 15000 }, () => {
  test("returns the dictionary (lemma) form of a verb", async () => {
    const words = await extractWords("食べる");
    const taberu = words.find(w => w.lemma === "食べる");
    assert.ok(taberu, "should find lemma 食べる");
    assert.equal(taberu?.readingHira, "たべる");
  });

  test("returns lemma form even for conjugated verbs", async () => {
    // 食べた is past tense — lemma should still be 食べる
    const words = await extractWords("食べた");
    assert.ok(words.some(w => w.lemma === "食べる"), "lemma should be 食べる not 食べた");
  });

  test("filters out particles (助詞)", async () => {
    const words = await extractWords("私は食べる");
    const lemmas = words.map(w => w.lemma);
    assert.ok(!lemmas.includes("は"), "particle は should be filtered");
  });

  test("filters out auxiliary verbs (助動詞)", async () => {
    const words = await extractWords("食べます");
    const lemmas = words.map(w => w.lemma);
    assert.ok(!lemmas.includes("ます"), "auxiliary ます should be filtered");
  });

  test("filters out punctuation (記号)", async () => {
    const words = await extractWords("食べる。");
    const lemmas = words.map(w => w.lemma);
    assert.ok(!lemmas.includes("。"), "punctuation should be filtered");
  });

  test("returns surface_form on each word", async () => {
    const words = await extractWords("走る");
    assert.ok(words.every(w => typeof w.surface === "string" && w.surface.length > 0));
  });

  test("handles empty string", async () => {
    const words = await extractWords("");
    assert.deepEqual(words, []);
  });

  test("filters out Latin/English words", async () => {
    const words = await extractWords("Hello world");
    assert.deepEqual(words, [], "pure Latin text should yield no words");
  });

  test("filters out numeric tokens", async () => {
    const words = await extractWords("123 456");
    assert.deepEqual(words, [], "numbers should yield no words");
  });

  test("keeps katakana loanwords", async () => {
    // アップル is katakana — it IS Japanese and should be kept
    const words = await extractWords("アップル");
    assert.ok(words.length > 0, "katakana words should be kept");
  });

  test("keeps Japanese words and drops Latin in mixed text", async () => {
    const words = await extractWords("食べるhello飲む");
    const lemmas = words.map(w => w.lemma);
    assert.ok(lemmas.includes("食べる"), "should keep 食べる");
    assert.ok(lemmas.includes("飲む"), "should keep 飲む");
    assert.ok(!lemmas.includes("hello"), "should drop 'hello'");
  });
});
