# Hit rule

What counts as a found event, a miss and a false alarm. It was written down before any
rate in this repo was computed. Changing it means re-scoring every published
number and noting the change here with its date.

## Unit

One image is one item. The model gives one answer per image: "an event" or
"not an event", plus a start, an end and, for a standing weekly plan, the weekdays.

## Verdict per item

- A model may answer each item several times (runs).
- A run that errored is ignored when deciding the verdict. If every run errored,
  or there is no answer at all, the item is an **error**. Errors are their own
  column and stay in the denominator, so a model cannot look better by failing.
- Otherwise the verdict is the strict majority of the answered runs. A tie is
  "not an event", because publishing is the costly side.
- Items whose runs disagree count towards the flip rate.

## Two levels

Reading a poster and deciding whether to publish it are different jobs. The
second is policy, so the caller supplies it and it is scored apart.

- **Read level.** The model's answers as given, with no policy.
- **Publish level.** The same answers after the publish policy. The default
  policy drops an event whose end is strictly before the moment the item was seen.

The key is a publishability key: it answers "should this be published at the
moment it was seen?". So a poster of an event already over is "not an event" in
the key, at both levels.

| Outcome | Key | Read | Publish |
|---|---|---|---|
| found | event | event | event |
| miss | event | not an event | not an event |
| publish miss | event | event | dropped by the policy |
| false alarm | not an event | event | event |
| caught by policy | not an event | event | dropped by the policy |
| correct reject | not an event | not an event | not an event |

"Caught by policy" is the case of a poster for an event that is already over.
The key says it is not an event. A model that reads it as an event and gives an
end before the seen time is stopped by the policy. It is neither a found event
nor a published false alarm, and it is reported on its own because it shows how
much work the policy is doing. The scorer does not check whether that past date
matches the poster; that needs a person looking at the image.

## Fields scored on a found event

Detection and dates are reported as separate numbers. A found event with the
wrong day still counts as found, and it shows up in the day number.

- **Day:** the day most of the event runs gave (a strict majority; a tie gives
  no day) must equal the key's day. No tolerance. Scored on every found event
  whose key has a day. A missing day counts as wrong, so leaving dates out cannot
  improve the number.
- **Weekdays:** the same majority, then the set must equal the key's set,
  ignoring case and order.
- **Not scored:** title, description, place, time of day, price. They are prose,
  and an exact-match rule on prose would mostly measure wording.

## Out of scope

- **Posters that list several events.** One verdict per image. Splitting a
  programme into one plan per act is a different task with its own labels.
- **Duplicates.** Two images of the same event are scored independently.
- **Malformed answers.** An answer without a yes/no event field is an error, not
  a rejection. Two answers for the same item and run are rejected outright.
- **Time zones.** All times are the venue's local wall-clock time. A time without
  an offset is compared as written, the same on every machine.
- **Ambiguous items.** They stay in the key with the owner's answer. If the owner
  has not answered, the key keeps the reference model's answer, and the item is
  listed in the report.

## Accepting a change

A prompt or model change is accepted only if, on all items:

1. it has no more publish-level misses than the current setup, and
2. it has fewer false alarms, or costs less with no more false alarms,

on all items pooled. The random and hard slices are also reported apart, so a
change that helps one and hurts the other is visible.

This is a rule on counts, not a statistical claim. With about 90 events in 400
items, a difference of one or two is within run-to-run flips.
