import initSqlJs from "sql.js";
import JSZip from "jszip";
import { createHash } from "crypto";
import type { Word } from "./types";

const MODEL_ID = 1607392319;

function deckId(name: string): number {
  const h = createHash("sha256").update(name).digest();
  return Number(BigInt("0x" + h.slice(0, 8).toString("hex")) & 0x7FFFFFFFFFFFFFFFn) + 1;
}

let sqlPromise: ReturnType<typeof initSqlJs> | null = null;
function getSql() {
  if (!sqlPromise) sqlPromise = initSqlJs();
  return sqlPromise;
}

let idCounter = 0;
function nextId(): number {
  return Date.now() + idCounter++;
}

function makeRuby(kanjiOrKana: string, readingHira: string): string {
  if (!readingHira) return kanjiOrKana;
  return `<ruby>${kanjiOrKana}<rt>${readingHira}</rt></ruby>`;
}

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Anki uses a base91-encoded hash as the note GUID
const BASE91 = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!#$%&()*+,-./:;<=>?@[]^_`{|}~";
function ankiGuid(fields: string[]): string {
  const h = createHash("sha256").update(fields.join("\x1f")).digest();
  let n = BigInt("0x" + h.slice(0, 8).toString("hex"));
  const chars: string[] = [];
  while (n > 0n) {
    chars.unshift(BASE91[Number(n % 91n)]);
    n /= 91n;
  }
  return chars.join("");
}

const ANKI_SCHEMA = `
CREATE TABLE col (
  id integer primary key, crt integer not null, mod integer not null,
  scm integer not null, ver integer not null, dty integer not null,
  usn integer not null, ls integer not null, conf text not null,
  models text not null, decks text not null, dconf text not null, tags text not null
);
CREATE TABLE notes (
  id integer primary key, guid text not null, mid integer not null,
  mod integer not null, usn integer not null, tags text not null,
  flds text not null, sfld integer not null, csum integer not null,
  flags integer not null, data text not null
);
CREATE TABLE cards (
  id integer primary key, nid integer not null, did integer not null,
  ord integer not null, mod integer not null, usn integer not null,
  type integer not null, queue integer not null, due integer not null,
  ivl integer not null, factor integer not null, reps integer not null,
  lapses integer not null, left integer not null, odue integer not null,
  odid integer not null, flags integer not null, data text not null
);
CREATE TABLE revlog (
  id integer primary key, cid integer not null, usn integer not null,
  ease integer not null, ivl integer not null, lastIvl integer not null,
  factor integer not null, time integer not null, type integer not null
);
CREATE TABLE graves (usn integer not null, oid integer not null, type integer not null);
CREATE INDEX ix_notes_usn on notes (usn);
CREATE INDEX ix_cards_usn on cards (usn);
CREATE INDEX ix_revlog_usn on revlog (usn);
CREATE INDEX ix_cards_nid on cards (nid);
CREATE INDEX ix_cards_sched on cards (did, queue, due);
CREATE INDEX ix_revlog_cid on revlog (cid);
CREATE INDEX ix_notes_csum on notes (csum);
`;

export type ExtractedWord = Word & { glosses: string[] };

export async function buildApkg(
  deckName: string,
  words: ExtractedWord[]
): Promise<Buffer> {
  const SQL = await getSql();
  const db = new SQL.Database();
  const now = Math.floor(Date.now() / 1000);
  const did = deckId(deckName);

  try {
    db.run(ANKI_SCHEMA);

    const model = {
      id: MODEL_ID, name: "Basic", type: 0, mod: now, usn: -1, sortf: 0, did,
      tmpls: [{
        name: "Card 1", ord: 0,
        qfmt: "{{Front}}",
        afmt: "{{FrontSide}}<hr id=answer>{{Back}}",
        did: null, bqfmt: "", bafmt: "", bfont: "", bsize: 0,
      }],
      flds: [
        { name: "Front", ord: 0, sticky: false, rtl: false, font: "Arial", size: 20 },
        { name: "Back",  ord: 1, sticky: false, rtl: false, font: "Arial", size: 20 },
      ],
      css: ".card { font-family: helvetica; font-size: 28px; text-align: center; color: black; background-color: white; }",
      latexPre: "", latexPost: "", tags: [], vers: [],
      req: [[0, "any", [0]]],
    };

    const deckBase = {
      desc: "", mod: now, usn: 0,
      lrnToday: [0, 0], revToday: [0, 0], newToday: [0, 0], timeToday: [0, 0],
      collapsed: false, browserCollapsed: false, conf: 1, extendNew: 0, extendRev: 50, dyn: 0,
    };

    const defaultDeck = { ...deckBase, id: 1, name: "Default" };
    const deck = { ...deckBase, id: did, name: deckName, usn: -1, extendNew: 10 };

    const dconf = {
      "1": {
        id: 1, name: "Default", replayq: true, timer: 0, maxTaken: 60, usn: 0, mod: 0, autoplay: true,
        lapse:  { delays: [10], mult: 0, minInt: 1, leechFails: 8, leechAction: 0 },
        rev:    { perDay: 200, ease4: 1.3, fuzz: 0.05, minSpace: 1, ivlFct: 1, maxIvl: 36500, bury: true },
        new:    { delays: [1, 10], ints: [1, 4, 7], initialFactor: 2500, perDay: 20, bury: true, order: 1, separate: true },
      },
    };

    db.run(
      `INSERT INTO col (id, crt, mod, scm, ver, dty, usn, ls, conf, models, decks, dconf, tags)
       VALUES (null, ?, ?, ?, 11, 0, -1, 0, ?, ?, ?, ?, '{}')`,
      [
        now, now * 1000, now * 1000,
        JSON.stringify({ nextPos: 1, sortType: "noteFld", sortBackwards: false }),
        JSON.stringify({ [MODEL_ID]: model }),
        JSON.stringify({ "1": defaultDeck, [did]: deck }),
        JSON.stringify(dconf),
      ]
    );

    for (const w of words) {
      const front = makeRuby(w.lemma, w.readingHira);
      const glossStr = w.glosses.length ? w.glosses.map(escHtml).join("; ") : "(no definition found)";
      const reading = w.readingHira ? escHtml(w.readingHira) : "(n/a)";
      const back = `<div><strong>Meaning:</strong> ${glossStr}</div><div><strong>Reading:</strong> ${reading}</div>`;
      const flds = `${front}\x1f${back}`;
      const guid = ankiGuid([front, back]);
      const nid = nextId();

      db.run(
        `INSERT INTO notes (id, guid, mid, mod, usn, tags, flds, sfld, csum, flags, data)
         VALUES (?, ?, ?, ?, -1, '', ?, 0, 0, 0, '')`,
        [nid, guid, MODEL_ID, now, flds]
      );

      db.run(
        `INSERT INTO cards (id, nid, did, ord, mod, usn, type, queue, due, ivl, factor, reps, lapses, left, odue, odid, flags, data)
         VALUES (?, ?, ?, 0, ?, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, '')`,
        [nextId(), nid, did, now]
      );
    }

    const dbBuffer = Buffer.from(db.export());
    const zip = new JSZip();
    zip.file("collection.anki2", dbBuffer);
    zip.file("media", "{}");
    return zip.generateAsync({ type: "nodebuffer" });
  } finally {
    db.close();
  }
}
