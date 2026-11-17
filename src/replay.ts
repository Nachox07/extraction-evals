// Replay a rule change in both directions: run the old and the new rule over
// the same stored inputs and diff the sets each would act on. A replay that
// lists only what the new rule acts on cannot see the cases it stopped acting on.

export interface Caption {
	id: string;
	text: string;
}

export type Splitter = (text: string) => string[];

export interface ReplayDiff {
	total: number;
	oldSplits: string[];
	newSplits: string[];
	lost: string[]; // the old rule split these, the new one does not
	gained: string[]; // the new rule splits these, the old one did not
	changed: string[]; // both split, into different sessions
}

/** Splits when a caption yields two or more distinct sessions. */
export function wouldSplit(split: Splitter, text: string): boolean {
	return new Set(split(text)).size >= 2;
}

export function replay(captions: Caption[], oldRule: Splitter, newRule: Splitter): ReplayDiff {
	const oldSplits: string[] = [];
	const newSplits: string[] = [];
	const lost: string[] = [];
	const gained: string[] = [];
	const changed: string[] = [];
	for (const c of captions) {
		const o = wouldSplit(oldRule, c.text);
		const n = wouldSplit(newRule, c.text);
		if (o) oldSplits.push(c.id);
		if (n) newSplits.push(c.id);
		if (o && !n) lost.push(c.id);
		if (n && !o) gained.push(c.id);
		if (o && n && sessionKey(oldRule(c.text)) !== sessionKey(newRule(c.text))) changed.push(c.id);
	}
	return { total: captions.length, oldSplits, newSplits, lost, gained, changed };
}

const sessionKey = (s: string[]): string => [...new Set(s)].sort().join("|");

// Two toy rules for the synthetic example. They are not the production rules.
const DAY = "(Mon|Tue|Wed|Thu|Fri|Sat|Sun)";

/** Old toy rule: a day, then up to four non-digit characters, then HH:MM. */
export const oldToyRule: Splitter = (text) =>
	[...text.matchAll(new RegExp(`\\b${DAY}\\b[^\\n\\d]{0,4}(\\d{1,2}):(\\d{2})`, "g"))].map((m) => `${m[1]} ${m[2]}:${m[3]}`);

/** New toy rule: stricter spacing (day, one space, time), but also reads "21h". */
export const newToyRule: Splitter = (text) =>
	[...text.matchAll(new RegExp(`\\b${DAY} (\\d{1,2})(?::(\\d{2})|h\\b)`, "g"))].map((m) => `${m[1]} ${m[2]}:${m[3] ?? "00"}`);
