#!/usr/bin/env node
/**
 * postexport_make_indexes.mjs
 * - Ensures directory routes have index.html so nginx can serve /path/ requests.
 * - For each out/draw/<round>.html -> create out/draw/<round>/index.html
 * - For each out/number/<n>.html -> create out/number/<n>/index.html
 * - If out/stats.html exists -> create out/stats/index.html
 * - If out/draws.html exists -> create out/draws/index.html
 * - If out/numbers.html exists -> create out/numbers/index.html
 */

import fs from "fs";
import path from "path";

const OUT_DIR = process.env.OUT_DIR || path.join(process.cwd(), "out");

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function copyFile(src, dst) {
  ensureDir(path.dirname(dst));
  fs.copyFileSync(src, dst);
}

function exists(p) {
  try {
    fs.accessSync(p, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

// Generic: out/<dir>/<id>.html -> out/<dir>/<id>/index.html
function fixNumericDir(dirName, pattern = /^\d+\.html$/) {
  const dir = path.join(OUT_DIR, dirName);
  if (!exists(dir)) return { created: 0, skipped: 0 };

  const files = fs.readdirSync(dir);
  let created = 0;
  let skipped = 0;

  for (const f of files) {
    if (!pattern.test(f)) continue;

    const id = f.replace(".html", "");
    const src = path.join(dir, f);
    const dst = path.join(dir, id, "index.html");

    if (exists(dst)) {
      skipped++;
      continue;
    }
    copyFile(src, dst);
    created++;
  }
  return { created, skipped };
}

// Top-level pages: out/<name>.html -> out/<name>/index.html
function fixTopLevelToDir(name) {
  const src = path.join(OUT_DIR, `${name}.html`);
  const dst = path.join(OUT_DIR, name, "index.html");
  if (!exists(src)) return { created: 0, skipped: 0, missing: 1 };
  if (exists(dst)) return { created: 0, skipped: 1, missing: 0 };
  copyFile(src, dst);
  return { created: 1, skipped: 0, missing: 0 };
}

function main() {
  if (!exists(OUT_DIR)) {
    console.error(`❌ OUT_DIR not found: ${OUT_DIR}`);
    process.exit(1);
  }

  const drawRes = fixNumericDir("draw");
  const numberRes = fixNumericDir("number");
  const statsRes = fixTopLevelToDir("stats");
  const drawsRes = fixTopLevelToDir("draws");
  const numbersRes = fixTopLevelToDir("numbers");

  console.log("✅ postexport_make_indexes done");
  console.log(`- OUT_DIR: ${OUT_DIR}`);
  console.log(`- draw index created: ${drawRes.created}, skipped: ${drawRes.skipped}`);
  console.log(`- number index created: ${numberRes.created}, skipped: ${numberRes.skipped}`);
  console.log(`- stats index: created=${statsRes.created}, skipped=${statsRes.skipped}, missing=${statsRes.missing}`);
  console.log(`- draws index: created=${drawsRes.created}, skipped=${drawsRes.skipped}, missing=${drawsRes.missing}`);
  console.log(`- numbers index: created=${numbersRes.created}, skipped=${numbersRes.skipped}, missing=${numbersRes.missing}`);
}

main();
