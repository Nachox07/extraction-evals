import { describe, expect, it } from "vitest";
import { dropEnded, majority, normWeekdays, parseTime, score, verdictOf, type Answer, type Item, type KeyEntry } from "../score.js";

const SEEN = "2026-10-09T14:00:00";
const seen = new Date(SEEN);
const item = (id: string): Item => ({ id, seenAt: SEEN });
const ev = (id: string, start: string, end: string, run = 0, weekdays: string[] | null = null): Answer => ({ id, run, event: true, start, end, weekdays });
const no = (id: string, run = 0): Answer => ({ id, run, event: false });
const err = (id: string, run = 0): Answer => ({ id, run, error: "timeout" });
const key = (event: boolean, extra: Partial<KeyEntry> = {}): KeyEntry => ({ event, ...extra });
const FUTURE = ["2026-10-10 21:00", "2026-10-10 23:59"] as const;
const PAST = ["2026-10-06 21:00", "2026-10-06 23:59"] as const;

describe("publish policy", () => {
	it("drops an event that ended before the item was seen", () => {
		expect(dropEnded(ev("a", ...PAST), seen)).toBe(true);
		expect(dropEnded(ev("a", ...FUTURE), seen)).toBe(false);
	});

	it("keeps an event with no end or an unreadable end", () => {
		expect(dropEnded({ id: "a", run: 0, event: true }, seen)).toBe(false);
		expect(dropEnded({ id: "a", run: 0, event: true, end: "soon" }, seen)).toBe(false);
	});
});

describe("verdict per item", () => {
	it("is an error only when every run errored", () => {
		expect(verdictOf([err("a"), err("a", 1)], seen, dropEnded).status).toBe("error");
		expect(verdictOf([err("a"), no("a", 1)], seen, dropEnded).status).toBe("not-event");
		expect(verdictOf([], seen, dropEnded).status).toBe("error");
	});

	it("takes a strict majority, a tie is not an event", () => {
		expect(verdictOf([ev("a", ...FUTURE), no("a", 1)], seen, dropEnded).status).toBe("not-event");
		const v = verdictOf([ev("a", ...FUTURE), no("a", 1), ev("a", ...FUTURE, 2)], seen, dropEnded);
		expect(v).toMatchObject({ status: "event", flipped: true, day: "2026-10-10" });
	});
});

describe("score", () => {
	it("keeps misses, false alarms and errors apart, errors in the denominator", () => {
		const items = ["miss", "fa", "hit", "bad"].map(item);
		const k = { miss: key(true), fa: key(false), hit: key(true), bad: key(true) };
		const { score: s } = score(items, k, [no("miss"), ev("fa", ...FUTURE), ev("hit", ...FUTURE), err("bad")]);
		expect(s).toMatchObject({ items: 4, keyEvents: 3, readMisses: 1, publishMisses: 1, falseAlarms: 1, errors: 1 });
	});

	it("counts an item with no answer as an error", () => {
		expect(score([item("a")], { a: key(true) }, []).score.errors).toBe(1);
	});

	it("skips items without a key entry", () => {
		expect(score([item("a"), item("b")], { a: key(false) }, [no("a"), no("b")]).score.items).toBe(1);
	});

	it("counts a non-event read as a past event as policy-caught, not a false alarm", () => {
		const r = score([item("a")], { a: key(false) }, [ev("a", ...PAST)]);
		expect(r.score).toMatchObject({ falseAlarms: 0, policyCaught: 1 });
		expect(r.results[0]?.outcome).toBe("policy-caught");
	});

	it("counts a key event with a wrong past end as a publish miss only", () => {
		const r = score([item("a")], { a: key(true) }, [ev("a", ...PAST)]);
		expect(r.score).toMatchObject({ readMisses: 0, publishMisses: 1 });
		expect(r.results[0]?.outcome).toBe("publish-miss");
	});

	it("applies no policy when given none", () => {
		const r = score([item("a")], { a: key(false) }, [ev("a", ...PAST)], () => false);
		expect(r.score).toMatchObject({ falseAlarms: 1, policyCaught: 0 });
	});

	it("checks the day exactly, only on found events", () => {
		const items = ["a", "b", "c"].map(item);
		const k = { a: key(true, { day: "2026-10-10" }), b: key(true, { day: "2026-10-11" }), c: key(false) };
		const r = score(items, k, [ev("a", ...FUTURE), ev("b", ...FUTURE), ev("c", ...FUTURE)]);
		expect(r.score).toMatchObject({ dayChecked: 2, dayRight: 1, falseAlarms: 1 });
		expect(r.results.map(x => x.dayRight)).toEqual([true, false, null]);
	});

	it("checks weekdays as a set, ignoring case and order", () => {
		const k = { a: key(true, { weekdays: ["Thu", "fri"] }), b: key(true, { weekdays: ["thu"] }) };
		const r = score([item("a"), item("b")], k, [ev("a", ...FUTURE, 0, ["friday", "thursday"]), ev("b", ...FUTURE)]);
		expect(r.score).toMatchObject({ weekdaysChecked: 2, weekdaysRight: 1 });
	});

	it("reports flips over items with more than one answered run", () => {
		const k = { a: key(true), b: key(true) };
		const rows = [ev("a", ...FUTURE), no("a", 1), ev("a", ...FUTURE, 2), ev("b", ...FUTURE), ev("b", ...FUTURE, 1)];
		expect(score([item("a"), item("b")], k, rows).score).toMatchObject({ multiRun: 2, flips: 1 });
	});

	it("rejects an item whose seen time cannot be read", () => {
		expect(() => score([{ id: "a", seenAt: "yesterday" }], { a: key(true) }, [])).toThrow(/seenAt/);
	});
});

describe("normWeekdays", () => {
	it("returns null for no pattern", () => {
		expect(normWeekdays(null)).toBeNull();
		expect(normWeekdays([])).toBeNull();
	});
});

describe("fields across runs", () => {
	it("takes the day most event runs gave, and none on a tie", () => {
		const a = (start: string, run: number) => ev("a", start, "2026-10-12 23:59", run);
		expect(verdictOf([a("2026-10-10 21:00", 0), a("2026-10-11 21:00", 1), a("2026-10-10 22:00", 2)], seen, dropEnded).day).toBe("2026-10-10");
		expect(verdictOf([a("2026-10-10 21:00", 0), a("2026-10-11 21:00", 1)], seen, dropEnded).day).toBeNull();
	});

	it("needs a strict majority", () => {
		expect(majority(["x", "y", "x"])).toBe("x");
		expect(majority(["x", null])).toBeNull();
	});

	it("counts a found event with no day as a wrong day when the key has one", () => {
		const r = score([item("a")], { a: key(true, { day: "2026-10-10" }) }, [{ id: "a", run: 0, event: true, start: null, end: null }]);
		expect(r.score).toMatchObject({ dayChecked: 1, dayRight: 0 });
		expect(r.results[0]?.dayRight).toBe(false);
	});
});

describe("malformed input", () => {
	it("treats an answer with no event field as an error, not a rejection", () => {
		const r = score([item("a")], { a: key(false) }, [{ id: "a", run: 0 }]);
		expect(r.score).toMatchObject({ errors: 1 });
	});

	it("rejects two answers for the same item and run", () => {
		expect(() => score([item("a")], { a: key(true) }, [no("a"), no("a")])).toThrow(/duplicate/);
	});
});

describe("time parsing", () => {
	it("reads a time with no offset as wall-clock time, the same on every machine", () => {
		expect(parseTime("2026-10-09 21:30")?.toISOString()).toBe("2026-10-09T21:30:00.000Z");
		expect(parseTime("2026-10-09T21:30")?.toISOString()).toBe("2026-10-09T21:30:00.000Z");
		expect(parseTime("2026-10-09")?.toISOString()).toBe("2026-10-09T00:00:00.000Z");
	});

	it("keeps an explicit offset", () => {
		expect(parseTime("2026-10-09T21:30:00+02:00")?.toISOString()).toBe("2026-10-09T19:30:00.000Z");
	});
});
