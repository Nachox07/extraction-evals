/**
 * Score one or more answer files against a key.
 *
 * Usage: npm run score -- <dir> [answers.json ...] [--no-policy] [--json out.json]
 *
 * <dir> holds items.json ([{id, seenAt, set?}]) and key.json ({id: {event, day?, weekdays?}}).
 * Answer files default to every <dir>/answers-*.json. Each is {label, answers: Answer[]}.
 * --no-policy scores the read level only (the publish policy never drops anything).
 *
 * With two or more answers files (one per model) it also prints, per model, the range
 * of misses and false alarms across that file's runs, and for every pair of models the
 * paired discordant counts and the exact McNemar p for misses and for false alarms,
 * on each model's majority-of-runs answers.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { discordant, dropEnded, isFalseAlarm, isMiss, mcnemarExact, noPolicy, runRange, runsOf, score, type Answer, type Item, type ItemResult, type KeyEntry } from "./score.js";

const args = process.argv.slice(2);
const jsonAt = args.indexOf("--json");
const jsonOut = jsonAt >= 0 ? args.splice(jsonAt, 2)[1] : undefined;
const policy = args.includes("--no-policy") ? noPolicy : dropEnded;
const [dir, ...files] = args.filter(a => !a.startsWith("--"));
if (!dir) {
	console.error("usage: npm run score -- <dir> [answers.json ...] [--no-policy] [--json out.json]");
	process.exit(1);
}
const items: Item[] = JSON.parse(readFileSync(join(dir, "items.json"), "utf8"));
const key: Record<string, KeyEntry> = JSON.parse(readFileSync(join(dir, "key.json"), "utf8"));
const answerFiles = files.length ? files : readdirSync(dir).filter(f => /^answers-.*\.json$/.test(f)).sort().map(f => join(dir, f));

const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}% (${a}/${b})` : "n/a");
const out: Record<string, unknown> = {};
const majorityResults = new Map<string, ItemResult[]>();
const rangeLines: string[] = [];
const sets = [...new Set(items.map(i => i.set ?? "all"))];
for (const f of answerFiles) {
	const file = JSON.parse(readFileSync(f, "utf8")) as { label?: string; answers: Answer[] };
	const label = file.label ?? basename(f);
	for (const set of sets) {
		const { score: s, results } = score(items.filter(i => (i.set ?? "all") === set), key, file.answers, policy);
		const name = sets.length > 1 ? `${label} [${set}]` : label;
		out[name] = { score: s, results };
		if (set === sets[0]) majorityResults.set(label, score(items, key, file.answers, policy).results);
		const runs = runsOf(file.answers);
		if (runs.length > 1) {
			const per = runs.map(r => score(items.filter(i => (i.set ?? "all") === set), key, file.answers.filter(a => a.run === r), policy).score);
			const m = runRange(per.map(p => p.publishMisses));
			const fa = runRange(per.map(p => p.falseAlarms));
			rangeLines.push(`${name}: ${runs.length} runs, misses (publish) ${m.min} to ${m.max}, false alarms ${fa.min} to ${fa.max}`);
		}
		console.log(`\n${name}`);
		console.table({
			items: s.items,
			"key events": s.keyEvents,
			"misses (read)": s.readMisses,
			"misses (publish)": s.publishMisses,
			"false alarms": s.falseAlarms,
			"caught by policy": s.policyCaught,
			errors: s.errors,
			"day right": pct(s.dayRight, s.dayChecked),
			"weekdays right": pct(s.weekdaysRight, s.weekdaysChecked),
			"flip rate": s.multiRun ? pct(s.flips, s.multiRun) : "n/a (1 run)",
		});
		const wrong = results.filter(r => !["found", "correct-reject"].includes(r.outcome) || r.dayRight === false);
		for (const r of wrong) console.log(`  ${r.id}: ${r.outcome}${r.dayRight === false ? ` (day ${r.publish.day}, key ${r.key.day})` : ""}`);
	}
}
if (rangeLines.length) {
	console.log("\nPer-run ranges (each run scored alone):");
	for (const l of rangeLines) console.log(`  ${l}`);
}
const labels = [...majorityResults.keys()];
if (labels.length > 1) {
	console.log("\nPaired comparison on majority-of-runs answers (exact two-sided McNemar):");
	for (let i = 0; i < labels.length; i++) {
		for (let j = i + 1; j < labels.length; j++) {
			const a = majorityResults.get(labels[i]!)!;
			const b = majorityResults.get(labels[j]!)!;
			for (const [what, pred] of [["misses", isMiss], ["false alarms", isFalseAlarm]] as const) {
				const d = discordant(a, b, pred);
				console.log(`  ${labels[i]} vs ${labels[j]}, ${what}: only first wrong ${d.onlyA}, only second wrong ${d.onlyB}, p = ${mcnemarExact(d.onlyA, d.onlyB).toFixed(2)}`);
			}
		}
	}
}
if (jsonOut) writeFileSync(jsonOut, JSON.stringify(out, null, 1));
