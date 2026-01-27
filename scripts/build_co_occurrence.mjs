import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "../public/data");

const historyPath = path.join(DATA_DIR, "lotto_history.json");
const outputPath = path.join(DATA_DIR, "co_occurrence.json");

// Read history
const history = JSON.parse(fs.readFileSync(historyPath, "utf-8"));
const draws = Array.isArray(history.data) ? history.data : Object.values(history.data);

// Count co-occurrences
const coCount = {};

// Initialize for all numbers 1-45
for (let i = 1; i <= 45; i++) {
  coCount[i] = {};
  for (let j = 1; j <= 45; j++) {
    if (i !== j) coCount[i][j] = 0;
  }
}

// Count pairs from each draw
for (const draw of draws) {
  const nums = draw.numbers;
  for (let i = 0; i < nums.length; i++) {
    for (let j = i + 1; j < nums.length; j++) {
      const a = nums[i];
      const b = nums[j];
      coCount[a][b]++;
      coCount[b][a]++;
    }
  }
}

// Convert to sorted arrays
const result = {};
for (let i = 1; i <= 45; i++) {
  const pairs = Object.entries(coCount[i])
    .map(([k, v]) => [k, v])
    .sort((a, b) => b[1] - a[1]);
  result[String(i)] = pairs;
}

// Write output
fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));

console.log("✅ co_occurrence.json generated");
console.log(`- Path: ${outputPath}`);
console.log(`- Numbers: 45`);
console.log(`- Total draws analyzed: ${draws.length}`);
