/**
 * Score one or more answer files against a key.
 *
 * Usage: npm run score -- <dir> [answers.json ...] [--no-policy] [--json out.json]
 *
 * <dir> holds items.json ([{id, seenAt, set?}]) and key.json ({id: {event, day?, weekdays?}}).
 * Answer files default to every <dir>/answers-*.json. Each is {label, answers: Answer[]}.
 * --no-policy scores the read level only (the publish policy never drops anything).
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { dropEnded, noPolicy, score, type Answer, type Item, type KeyEntry } from "./score.js";

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
const sets = [...new Set(items.map(i => i.set ?? "all"))];
for (const f of answerFiles) {
	const file = JSON.parse(readFileSync(f, "utf8")) as { label?: string; answers: Answer[] };
	const label = file.label ?? basename(f);
	for (const set of sets) {
		const { score: s, results } = score(items.filter(i => (i.set ?? "all") === set), key, file.answers, policy);
		const name = sets.length > 1 ? `${label} [${set}]` : label;
		out[name] = { score: s, results };
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
if (jsonOut) writeFileSync(jsonOut, JSON.stringify(out, null, 1));
