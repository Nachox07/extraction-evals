# Hit rule

What counts as a hit, a miss and a false alarm. It was written down before any
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

- **Read level.** No policy. Did the model read the image right?
- **Publish level.** The same answers after the publish policy. The default
  policy drops an event whose end is strictly before the moment the item was seen.

| Outcome | Key | Read | Publish |
|---|---|---|---|
| hit | event | event | event |
| miss | event | not an event | not an event |
| publish miss | event | event | dropped by the policy (a wrong end date) |
| false alarm | not an event | event | event |
| caught by policy | not an event | event | dropped by the policy |
| correct reject | not an event | not an event | not an event |

"Caught by policy" is the case of a poster for an event that is already over.
The key says it is not an event. A model that reads it as an event with the
correct past date has read the poster faithfully, and the policy stops it. It is
neither a hit nor a published false alarm, and it is reported on its own because
it shows how much work the policy is doing.

## Fields scored on a hit

- **Day:** the first ten characters of the start must equal the key's day. There
  is no tolerance: a wrong day is a wrong plan. Scored only when the key has a day.
- **Weekdays:** the set must equal the key's set, ignoring case and order.
- **Not scored:** title, description, place, time of day, price. They are prose,
  and an exact-match rule on prose would mostly measure wording.

## Out of scope

- **Posters that list several events.** One verdict per image. Splitting a
  programme into one plan per act is a different task with its own labels.
- **Duplicates.** Two images of the same event are scored independently.
- **Ambiguous items.** They stay in the key with the owner's answer. If the owner
  has not answered, the key keeps the reference model's answer, and the item is
  listed in the report.

## Accepting a change

A prompt or model change is accepted only if, on all items:

1. it has no more publish-level misses than the current setup, and
2. it has fewer false alarms, or costs less with no more false alarms.

This is a rule on counts, not a statistical claim. With about 90 events in 400
items, a difference of one or two is within run-to-run flips.
