#!/usr/bin/env node
/**
 * Downloads the JMDict English dictionary in Yomichan term-bank format.
 * The zip contains term_bank_*.json files with rows: [expression, reading, defGroups, ...]
 *
 * Source: https://github.com/themoeway/jmdict-yomitan/releases
 */

import { createWriteStream, mkdirSync } from "fs";
import { pipeline } from "stream/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT = path.join(__dirname, "../server/data/jmdict_english.zip");

// Yomitan release — JMDict English, term-bank zip format
const URL =
  "https://github.com/themoeway/jmdict-yomitan/releases/latest/download/jmdict_english.zip";

mkdirSync(path.dirname(OUTPUT), { recursive: true });

console.log(`Downloading JMDict from:\n  ${URL}`);
console.log(`Saving to:\n  ${OUTPUT}\n`);

const res = await fetch(URL);
if (!res.ok || !res.body) {
  console.error(`Failed: ${res.status} ${res.statusText}`);
  process.exit(1);
}

const total = Number(res.headers.get("content-length") ?? 0);
let received = 0;

const progressStream = new TransformStream({
  transform(chunk, controller) {
    received += chunk.byteLength;
    if (total) {
      const pct = ((received / total) * 100).toFixed(1);
      process.stdout.write(`\r  ${pct}% (${(received / 1e6).toFixed(1)} MB)`);
    }
    controller.enqueue(chunk);
  },
});

const writer = createWriteStream(OUTPUT);
const readable = res.body.pipeThrough(progressStream);

await pipeline(readable, writer);
console.log(`\n\nDone! Run 'npm run dev' to start the server.`);
