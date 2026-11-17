import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { newToyRule, oldToyRule, replay, wouldSplit, type Caption, type Splitter } from "../replay.js";

const caps = (...texts: string[]): Caption[] => texts.map((text, i) => ({ id: `c${i}`, text }));

describe("replay in both directions", () => {
	it("reports a case only the old rule split as lost", () => {
		const d = replay(caps("Fri ⏰ 22:00, Sat ⏰ 22:00"), oldToyRule, newToyRule);
		expect(d.lost).toEqual(["c0"]);
		expect(d.newSplits).toEqual([]);
	});

	it("reports a case only the new rule split as gained", () => {
		const d = replay(caps("Thu 21h and Fri 21h"), oldToyRule, newToyRule);
		expect(d.gained).toEqual(["c0"]);
		expect(d.oldSplits).toEqual([]);
	});

	it("flags a case both rules split into different sessions as changed", () => {
		const keepFirst: Splitter = (t) => oldToyRule(t);
		const shifted: Splitter = (t) => oldToyRule(t).map((s) => s.replace("21:00", "22:00"));
		const d = replay(caps("Sat 21:00 and Sun 20:00"), keepFirst, shifted);
		expect(d.changed).toEqual(["c0"]);
		expect(d.lost).toEqual([]);
		expect(d.gained).toEqual([]);
	});

	it("does not split one session repeated twice", () => {
		expect(wouldSplit(oldToyRule, "Sat 21:00. See you Sat 21:00!")).toBe(false);
	});

	it("finds the lost and gained cases in the synthetic captions", () => {
		const captions = JSON.parse(readFileSync(new URL("../../examples/replay/captions.json", import.meta.url), "utf8")) as Caption[];
		const d = replay(captions, oldToyRule, newToyRule);
		expect(d.lost).toEqual(["c02"]);
		expect(d.gained).toEqual(["c03"]);
		expect(d.newSplits).toHaveLength(5);
	});
});
