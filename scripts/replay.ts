// Usage: npm run replay -- examples/replay/captions.json
import { readFileSync } from "node:fs";
import { newToyRule, oldToyRule, replay, type Caption } from "../src/replay.js";

const path = process.argv[2] ?? "examples/replay/captions.json";
const captions = JSON.parse(readFileSync(path, "utf8")) as Caption[];
const d = replay(captions, oldToyRule, newToyRule);
console.log(`captions replayed: ${d.total}`);
console.log(`old rule splits:   ${d.oldSplits.length}`);
console.log(`new rule splits:   ${d.newSplits.length}`);
console.log(`lost (old only):   ${d.lost.length} ${d.lost.join(", ")}`);
console.log(`gained (new only): ${d.gained.length} ${d.gained.join(", ")}`);
console.log(`changed sessions:  ${d.changed.length} ${d.changed.join(", ")}`);
console.log("\nA replay that lists only the new rule's splits would show");
console.log(`${d.newSplits.length} cases and say nothing about the ${d.lost.length} it lost.`);
