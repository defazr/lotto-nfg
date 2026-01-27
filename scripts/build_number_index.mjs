#!/usr/bin/env node
/**
 * build_number_index.mjs
 * - Reads lotto_history.json and generates number_index.json
 * - For each number 1-45: count, recent_draws (max 50), first_seen, last_seen
 */

import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "public", "data");
const HISTORY_PATH = path.join(DATA_DIR, "lotto_history.json");
const OUTPUT_PATH = path.join(DATA_DIR, "number_index.json");

function main() {
  if (!fs.existsSync(HISTORY_PATH)) {
    console.error(`❌ lotto_history.json not found: ${HISTORY_PATH}`);
    process.exit(1);
  }

  const history = JSON.parse(fs.readFileSync(HISTORY_PATH, "utf-8"));
  const draws = Array.isArray(history.data)
    ? history.data
    : Object.values(history.data);

  // Sort by draw_no ascending
  draws.sort((a, b) => a.draw_no - b.draw_no);

  // Initialize number stats
  const numbers = {};
  for (let n = 1; n <= 45; n++) {
    numbers[n] = {
      count: 0,
      draws: [], // will trim to recent 50 later
      first_seen: null,
      last_seen: null,
    };
  }

  // Process all draws
  for (const draw of draws) {
    const round = draw.draw_no;
    for (const n of draw.numbers) {
      const stat = numbers[n];
      stat.count++;
      stat.draws.push(round);
      if (stat.first_seen === null) stat.first_seen = round;
      stat.last_seen = round;
    }
  }

  // Finalize: recent_draws = last 50, sorted descending (newest first)
  const result = {};
  for (let n = 1; n <= 45; n++) {
    const stat = numbers[n];
    const recentDraws = stat.draws.slice(-50).reverse();
    result[n] = {
      count: stat.count,
      recent_draws: recentDraws,
      first_seen: stat.first_seen,
      last_seen: stat.last_seen,
    };
  }

  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const generated = kst.toISOString().replace("T", " ").slice(0, 19) + " KST";

  const output = {
    meta: {
      generated_at_kst: generated,
      latest_draw: history.meta.latest_draw,
      total_draws: history.meta.total_draws,
    },
    numbers: result,
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
  console.log(`✅ number_index.json generated`);
  console.log(`- Path: ${OUTPUT_PATH}`);
  console.log(`- Numbers: 45`);
  console.log(`- Latest draw: ${history.meta.latest_draw}`);
}

main();
