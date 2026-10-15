/**
 * Runs a Claude model over a directory of items and writes answers-<label>.json
 * for the scorer. Every run spends API money: 20 synthetic posters on a mid-size
 * model cost a few cents per run.
 *
 * Usage: ANTHROPIC_API_KEY=... npm run run-model -- <dir> <model> [--runs N] [--prompt prompts/extract-v1.md] [--label name]
 *
 * <dir>/items.json: [{id, image, seenAt, publishedAt?, city?}]; image paths are relative to <dir>.
 */
import Anthropic from "@anthropic-ai/sdk";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Answer } from "../src/score.js";

interface RunItem { id: string; image: string; seenAt: string; publishedAt?: string; city?: string }

const args = process.argv.slice(2);
function flag(name: string, fallback: string): string {
	const i = args.indexOf(name);
	return i >= 0 ? args.splice(i, 2)[1] ?? fallback : fallback;
}
const runs = Number(flag("--runs", "1"));
const promptFile = flag("--prompt", "prompts/extract-v1.md");
const labelArg = flag("--label", "");
const [dir, model] = args;
if (!dir || !model) {
	console.error("usage: npm run run-model -- <dir> <model> [--runs N] [--prompt file] [--label name]");
	process.exit(1);
}
const label = labelArg || model;
const template = readFileSync(promptFile, "utf8");
const items: RunItem[] = JSON.parse(readFileSync(join(dir, "items.json"), "utf8"));
const client = new Anthropic();

const REPORT = {
	name: "report",
	description: "Report whether the image announces a plan, and when.",
	input_schema: {
		type: "object" as const,
		properties: {
			event: { type: "boolean", description: "true if the image announces a plan someone can attend" },
			start: { type: ["string", "null"], description: "start, YYYY-MM-DD HH:MM, local time" },
			end: { type: ["string", "null"], description: "end, YYYY-MM-DD HH:MM; 23:59 of the start day if not given" },
			weekdays: { type: ["array", "null"], items: { type: "string", enum: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] }, description: "weekdays of a standing weekly plan, else null" },
			reason: { type: "string", description: "one sentence" },
		},
		required: ["event", "start", "end", "weekdays", "reason"],
	},
};

function mediaType(buf: Buffer): "image/png" | "image/jpeg" | "image/webp" {
	if (buf[0] === 0xff && buf[1] === 0xd8) return "image/jpeg";
	if (buf.subarray(8, 12).toString() === "WEBP") return "image/webp";
	return "image/png";
}

const answers: Answer[] = [];
let inputTokens = 0, outputTokens = 0;
for (const item of items) {
	const buf = readFileSync(join(dir, item.image));
	const prompt = template
		.replace("{{seenAt}}", item.seenAt)
		.replace("{{publishedAt}}", item.publishedAt ?? item.seenAt)
		.replace("{{city}}", item.city ?? "an unnamed city");
	for (let run = 0; run < runs; run++) {
		const t0 = Date.now();
		try {
			const res = await client.messages.create({
				model,
				max_tokens: 1024,
				tools: [REPORT],
				tool_choice: { type: "tool", name: "report" },
				messages: [{ role: "user", content: [
					{ type: "image", source: { type: "base64", media_type: mediaType(buf), data: buf.toString("base64") } },
					{ type: "text", text: prompt },
				] }],
			});
			inputTokens += res.usage.input_tokens;
			outputTokens += res.usage.output_tokens;
			const call = res.content.find(c => c.type === "tool_use");
			if (!call || call.type !== "tool_use") throw new Error("no tool call");
			const r = call.input as { event: boolean; start: string | null; end: string | null; weekdays: string[] | null };
			answers.push({ id: item.id, run, event: r.event, start: r.start, end: r.end, weekdays: r.weekdays, ms: Date.now() - t0 });
		} catch (e) {
			answers.push({ id: item.id, run, error: e instanceof Error ? e.message : String(e), ms: Date.now() - t0 });
		}
		process.stdout.write(".");
	}
}
const out = join(dir, `answers-${label.replace(/[^A-Za-z0-9._-]+/g, "_")}.json`);
writeFileSync(out, JSON.stringify({ label, model, runs, prompt: promptFile, usage: { inputTokens, outputTokens }, answers }, null, 1) + "\n");
console.log(`\n${answers.length} answers → ${out} (${inputTokens} input, ${outputTokens} output tokens)`);
