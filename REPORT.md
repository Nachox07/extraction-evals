# Report: measuring a prompt change on a production extraction pipeline

**Status: draft, counts final.** The owner answered every open item on 16
October: 6 disputes and a blind audit of 20 agreements in the main set, and 15
disputes in the held-out set. All counts below include those answers.

## The system

A service reads images that bars and venues post publicly, decides whether each
one announces a plan someone could go to, extracts the date, and publishes the
plans to city channels and a web agenda. A vision model does the reading. Code
does everything after that, including the rule that drops events already over.

The question this report answers: does a change to the extraction prompt help,
and how do we know?

## The data

The private runs used public venue posts, not in this repo.

- 400 images seen between 3 and 12 October 2026, from 70 venues in four cities.
- 300 drawn at random from the 795 usable images collected in that window, so
  the mix matches what the pipeline saw in those ten days and nothing wider.
  Then 100 "hard" items from the rest: quotas for the categories that cause
  trouble (reposts of another venue's event, opening hours, weekly plans, drink
  and dish photos, dates far ahead with no year, events already over, giveaways,
  job calls, cancellations), filled up with items where models disagreed.
- 91 of the 400 are events under the key. That is the denominator for misses. Images are scored independently, and a venue often posts
  the same plan more than once, so the number of distinct events is somewhat lower and
  was not counted.

The random and hard sets are reported together below. They are also scored
apart, and the hard set is never used to make claims about production rates.

## The answer key

A key built from the model under test grades that model against itself. So:

1. A reference model (Claude Opus 5.5, high effort) answered every item twice.
   It was chosen because it is not the model under test and it is the largest
   model from the same vendor; the steps below check it rather than trust it.
   The production publish rule was applied to its answers too.
2. Items where its two runs disagreed, where it disagreed with the production
   model, where the two picked different days, or where two cheap models both
   contradicted it, were flagged.
3. 26 items were flagged in total. The owner answered 20 of them on a review
   page, and the owner's answer always wins; 3 verdicts flipped. He answered the
   last 6 later, and 2 more flipped.
   Flagging leans on disagreement, so an item where both Claude models are wrong
   in the same way is the least likely to be flagged; that is what the blind
   audit below is for.
4. A second vendor (GPT-6 Astra, one run, $1.75) answered the 26 disputed items,
   12 posters of events already over, and 20 random items where the models agreed.
   - On the 20 agreements it agreed with the key on 19. The one disagreement was
     its own mistake: a clearly dated concert poster.
   - On the 12 past posters it agreed with the key on 11 that a poster of an
     event already over is not an event.
   - On the disputes it disagreed 8 times: 4 on items the owner had already
     answered, 2 clear mistakes of its own, 1 timing edge case, 1 genuinely
     ambiguous item that went back to the owner.

Agreement between models is not truth, so the owner also labelled the 20
agreements blind, without seeing any model's answer. He agreed with the key on
19. The one he overturned is a story that points to a link for the details: not
enough on the image itself to publish. So roughly 1 key error in 20 where both
Claude models agree, the same rate the second vendor found.

## Results

The production model (Claude Sonnet 5.5, medium effort) with three prompts.
Two runs per item. Read and publish levels are defined in `docs/hit-rule.md`.
All 400 items:

| Prompt | Misses | False alarms (published) | Caught by policy | Day right | Items that flipped |
|---|---|---|---|---|---|
| Baseline | 2 | 8 | 9 | 83 of 87 | 3 |
| `ab`: food-photo rule + recap rule (shipped) | 1 | 5 | 9 | 86 of 89 | 2 |
| `all`: first recap wording + audience rule | 5 | 2 | 8 | 82 of 85 | 0 |

By slice, misses / false alarms:

| Prompt | Random (300, 51 events) | Hard (100, 40 events) |
|---|---|---|
| Baseline | 1 / 3 | 1 / 5 |
| `ab` | 0 / 3 | 1 / 2 |
| `all` | 2 / 0 | 3 / 2 |

`ab` is no worse than the baseline on either slice. Its false-alarm gain is all
in the hard slice. On the random slice it has one miss fewer and the same false alarms.

No run errored. Misses are the same at the read and publish levels for every
prompt: the publish rule never threw away a real event because of a wrong end date.

## Read this first: the result is in-sample

The two rules in `ab` were written after reading the production model's errors
on these same 400 images. So the table shows that the rules fix the errors they
were written for, without breaking other items in this set. It does not show
how much they help on new images. That is what the held-out set below tests, and
on it the gain does not replicate.

The acceptance rule also looks only at misses and false alarms. Dates are
reported but do not gate a change: `ab` gets 3 days wrong against the
baseline's 4, so it is no worse, but a prompt could pass the rule and still put
an event on the wrong night.

## What the numbers say

- **`ab` was shipped.** It meets the acceptance rule on the pooled counts: no
  more misses than the baseline (1 against 2) and fewer false alarms (5 against 8).
- **`all` was rejected**, although it has the fewest false alarms. It more than
  doubled the misses (5 against 2). One of its five is shared with the baseline. The four new ones:
  two children's shows (dropped by the audience rule), a "last weekend of the
  season" post (dropped by the first recap wording), and a borderline news post
  about a charity event, which `ab` also misses. The owner decided family plans
  stay, and the shipped recap wording says a continuing run is still an event.
- **The publish rule carries real weight.** At the read level the production
  model calls 8 or 9 items "an event" that the key says are not, each with an end
  before the moment it was seen. The rule that drops ended events removes all of
  them. For `ab`, all 9 were checked against the key's notes: match screenings
  and gigs from the night before, seen the next day. The reference model's own
  answers have 0 such cases, because it rejects them while reading. That gap is
  invisible with only one score. On this set it means the date check is doing
  work the prompt does not, so removing it would need its own test.

## Held-out check: the gain does not replicate

331 images seen on 14 and 15 October, after `ab` shipped, from the same 70
venues. Same method: the reference model twice for the key, the production
model twice with each prompt. `without-ab` is today's prompt with the two `ab`
lines removed.

| Prompt | Misses | False alarms | Day right |
|---|---|---|---|
| `ab` (shipped) | 2 | 1 | 120 of 122 |
| `without-ab` | 3 | 1 | 119 of 121 |

127 of the 331 are events under the key. The two prompts differ on one item:
a poster the shipped prompt reads as an event and `without-ab` does not. The
shipped prompt still loses it, because it gives the event an end date that has
already passed, so the publish rule drops it. Both prompts miss a new bar's
opening day and both publish a concert story with no date or time on it. The
false-alarm drop seen in-sample (8 to 5) does not appear: both prompts have 1.

The 15 items the reference and production models disagreed on went to the
owner. He overturned the reference model on 9 of them. Against the final key,
the reference model has 3 misses and 6 false alarms on this set, more than the
production model. Most of the 9 were stories with too little on the image to
plan around (a crowd photo, a link to tap, a poster with no day or price), which
the reference model called events. So on new data the key was only as good as
the owner's review of the disagreements. Without that step the report would have
said the production model misses 8 events; it misses 2.

The honest reading: the `ab` rules are harmless, and their benefit on new data
is within noise. Shipping them was defensible under the rule as written, and
the held-out run is what the rule should have required before shipping.

On 16 October production changed one field description in the extraction
schema (whether the post invites a public comment). It does not touch the date
or event rules, but production now differs from the prompt measured here by
that one line.

## What the numbers do not support

- **That `ab` is better by a precise amount, or at all on new images.** The
  margins are 1 miss and 3 false alarms. Run-to-run flips are the same size: the
  baseline missed two real events in one run and caught them in the other. The
  false-alarm drop is all in the hard slice. The decision is a rule on counts,
  stated before looking, not a significance claim, and it is in-sample (above).
- **Production rates.** 400 images over ten days, from the venues followed then,
  in a few cities. The random slice matches that mix and nothing wider.
- **Anything about other models.** A ten-model comparison on an earlier 150-image
  set exists and is not published. Its key was partly built from the production
  model's own answers, and a ranking from one small private set says more about
  the set than about the models.

## Cost

About $68 of API spend in total: the main set ~$38, the held-out set ~$25, and
$1.75 for the cross-vendor check. Per thousand calls, roughly $6–8 for the
production model and $15–22 for the reference model.

## Reproduce the method

The real images cannot be shared. `examples/synthetic/` has 20 invented posters
with a key, one per kind of case in the hit rule, and the same scorer. See the README.
