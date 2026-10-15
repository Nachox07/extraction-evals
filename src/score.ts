/**
 * Scoring for "is this image an event, and when?" extraction.
 *
 * Rules (docs/hit-rule.md is the full text):
 *  - one verdict per item: strict majority of the answered runs, a tie is "not an event";
 *  - an item whose runs all errored (or that has no answer) is an error, and stays in
 *    the denominator;
 *  - misses and false alarms are separate counts, never folded into one accuracy;
 *  - two levels. Read: did the model read the image right, no policy applied.
 *    Publish: the same answers after the caller's publish policy (by default, an
 *    event whose end is before the time the item was seen is dropped);
 *  - a non-event the model read as an event that the policy then removed is a
 *    "policy-caught read": neither a hit nor a published false alarm.
 */

export interface Item {
	id: string;
	/** When the item was collected; the publish policy judges "already over" against it. ISO 8601. */
	seenAt: string;
	/** Optional slice name, e.g. "random" or "hard". */
	set?: string;
}

export interface KeyEntry {
	event: boolean;
	/** YYYY-MM-DD of the event's start, when it is an event with a date. */
	day?: string | null;
	/** Weekdays of a standing plan, e.g. ["thu"]; null for a one-off. */
	weekdays?: string[] | null;
}

export interface Answer {
	id: string;
	run: number;
	event?: boolean;
	/** "YYYY-MM-DD HH:MM" or ISO. */
	start?: string | null;
	end?: string | null;
	weekdays?: string[] | null;
	error?: string;
	ms?: number;
}

/** Returns true when the answer would not be published. */
export type PublishPolicy = (answer: Answer, seenAt: Date) => boolean;

export function parseTime(s: string | null | undefined): Date | null {
	if (!s) return null;
	const d = new Date(s.includes("T") ? s : s.replace(" ", "T"));
	return Number.isNaN(d.getTime()) ? null : d;
}

/** Default policy: drop an event whose end is strictly before the moment the item was seen. */
export const dropEnded: PublishPolicy = (a, seenAt) => {
	const end = parseTime(a.end);
	return end !== null && end < seenAt;
};

export const noPolicy: PublishPolicy = () => false;

export type Status = "event" | "not-event" | "error";

export interface RunView {
	status: Status;
	removedByPolicy: boolean;
	day: string | null;
	weekdays: string[] | null;
}

export function normWeekdays(w: string[] | null | undefined): string[] | null {
	if (!w || w.length === 0) return null;
	return [...new Set(w.map(x => x.toLowerCase().slice(0, 3)))].sort();
}

export function viewAnswer(a: Answer, seenAt: Date, policy: PublishPolicy): RunView {
	if (a.error) return { status: "error", removedByPolicy: false, day: null, weekdays: null };
	if (!a.event) return { status: "not-event", removedByPolicy: false, day: null, weekdays: null };
	if (policy(a, seenAt)) return { status: "not-event", removedByPolicy: true, day: null, weekdays: null };
	return {
		status: "event",
		removedByPolicy: false,
		day: a.start ? a.start.slice(0, 10) : null,
		weekdays: normWeekdays(a.weekdays),
	};
}

export interface Verdict {
	status: Status;
	flipped: boolean;
	day: string | null;
	weekdays: string[] | null;
}

export function verdictOf(answers: Answer[], seenAt: Date, policy: PublishPolicy): Verdict {
	const views = answers.map(a => viewAnswer(a, seenAt, policy));
	const answered = views.filter(v => v.status !== "error");
	if (answered.length === 0) return { status: "error", flipped: false, day: null, weekdays: null };
	const events = answered.filter(v => v.status === "event");
	const isEvent = events.length * 2 > answered.length;
	return {
		status: isEvent ? "event" : "not-event",
		flipped: events.length > 0 && events.length < answered.length,
		day: isEvent ? events.find(v => v.day)?.day ?? null : null,
		weekdays: isEvent ? events.find(v => v.weekdays)?.weekdays ?? null : null,
	};
}

export interface Score {
	items: number;
	keyEvents: number;
	errors: number;
	readMisses: number;
	publishMisses: number;
	falseAlarms: number;
	policyCaught: number;
	dayChecked: number;
	dayRight: number;
	weekdaysChecked: number;
	weekdaysRight: number;
	multiRun: number;
	flips: number;
}

export interface ItemResult {
	id: string;
	key: KeyEntry;
	read: Verdict;
	publish: Verdict;
	outcome: "hit" | "correct-reject" | "miss" | "publish-miss" | "false-alarm" | "policy-caught" | "error";
	dayRight: boolean | null;
}

/** Score answers against a key. Items with no key entry are skipped. */
export function score(items: Item[], key: Record<string, KeyEntry>, answers: Answer[], policy: PublishPolicy = dropEnded): { score: Score; results: ItemResult[] } {
	const byId = new Map<string, Answer[]>();
	for (const a of answers) byId.set(a.id, [...(byId.get(a.id) ?? []), a]);
	const s: Score = { items: 0, keyEvents: 0, errors: 0, readMisses: 0, publishMisses: 0, falseAlarms: 0, policyCaught: 0, dayChecked: 0, dayRight: 0, weekdaysChecked: 0, weekdaysRight: 0, multiRun: 0, flips: 0 };
	const results: ItemResult[] = [];
	for (const item of items) {
		const k = key[item.id];
		if (!k) continue;
		const seenAt = parseTime(item.seenAt);
		if (!seenAt) throw new Error(`item ${item.id}: unparseable seenAt ${item.seenAt}`);
		const rows = byId.get(item.id) ?? [];
		const read = verdictOf(rows, seenAt, noPolicy);
		const pub = verdictOf(rows, seenAt, policy);
		s.items++;
		if (k.event) s.keyEvents++;
		let outcome: ItemResult["outcome"];
		let dayRight: boolean | null = null;
		if (pub.status === "error") {
			s.errors++;
			outcome = "error";
		} else {
			if (rows.filter(r => !r.error).length > 1) {
				s.multiRun++;
				if (read.flipped) s.flips++;
			}
			if (k.event) {
				if (read.status === "not-event") { s.readMisses++; s.publishMisses++; outcome = "miss"; }
				else if (pub.status === "not-event") { s.publishMisses++; outcome = "publish-miss"; }
				else outcome = "hit";
			} else if (pub.status === "event") { s.falseAlarms++; outcome = "false-alarm"; }
			else if (read.status === "event") { s.policyCaught++; outcome = "policy-caught"; }
			else outcome = "correct-reject";
			if (outcome === "hit") {
				if (k.day && pub.day) {
					s.dayChecked++;
					dayRight = k.day === pub.day;
					if (dayRight) s.dayRight++;
				}
				const kw = normWeekdays(k.weekdays);
				if (kw) {
					s.weekdaysChecked++;
					if (pub.weekdays && pub.weekdays.join() === kw.join()) s.weekdaysRight++;
				}
			}
		}
		results.push({ id: item.id, key: k, read, publish: pub, outcome, dayRight });
	}
	return { score: s, results };
}
