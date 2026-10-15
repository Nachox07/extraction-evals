# Report: measuring a prompt change on a production extraction pipeline

**Status: draft.** Six disputed items still wait on an owner answer, and the
owner's blind audit of 20 agreements is not done. Any count below can change by
up to the number of those items it touches when they land.

## The system

A service reads images that bars and venues post publicly, decides whether each
one announces a plan someone could go to, extracts the date, and publishes the
plans to city channels and a web agenda. A vision model does the reading. Code
does everything after that, including the rule that drops events already over.

The question this report answers: does a change to the extraction prompt help,
and how do we know?

## The data

The private runs used public venue posts, not in this repo.

- 400 images seen between 3 and 12 October 2026: 329 story frames and 71 feed
  posts.
- 300 drawn at random from everything collected, so the mix matches production.
  Then 100 "hard" items from the rest: quotas for the categories that cause
  trouble (reposts of another venue's event, opening hours, weekly plans, drink
  and dish photos, dates far ahead with no year, events already over, giveaways,
  job calls, cancellations), filled up with items where models disagreed.
- 92 of the 400 are events under the key. That is the denominator for misses.

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
3. The owner answered 20 flagged items on a review page. The owner's answer
   always wins. 3 verdicts flipped.
4. A second vendor (GPT-6 Astra, one run, $1.75) answered the 26 disputed items,
   12 posters of events already over, and 20 random items where the models agreed.
   - On the 20 agreements it agreed with the key on 19. The one disagreement was
     its own mistake: a clearly dated concert poster.
   - On the 12 past posters it agreed with the key on 11 that a poster of an
     event already over is not an event.
   - On the disputes it disagreed 8 times: 4 on items the owner had already
     answered, 2 clear mistakes of its own, 1 timing edge case, 1 genuinely
     ambiguous item that went back to the owner.

Agreement between models is not truth, so the remaining check is the owner
labelling the 20 agreements blind, without seeing any model's answer.

## Results

The production model (Claude Sonnet 5.5, medium effort) with three prompts.
Two runs per item. Read and publish levels are defined in `docs/hit-rule.md`.
All 400 items:

| Prompt | Misses | False alarms (published) | Caught by policy | Day right | Items that flipped |
|---|---|---|---|---|---|
| Baseline | 3 | 8 | 9 | 84 of 88 | 3 |
| `ab`: food-photo rule + recap rule (shipped) | 2 | 5 | 9 | 87 of 90 | 2 |
| `all`: first recap wording + audience rule | 6 | 2 | 8 | 83 of 86 | 0 |

By slice, misses / false alarms:

| Prompt | Random (300, 51 events) | Hard (100, 41 events) |
|---|---|---|
| Baseline | 2 / 4 | 1 / 4 |
| `ab` | 1 / 4 | 1 / 1 |
| `all` | 3 / 1 | 3 / 1 |

`ab` is no worse than the baseline on either slice. Its false-alarm gain is all
in the hard slice. On the random slice it has one miss fewer and the same false alarms.

No run errored. Misses are the same at the read and publish levels for every
prompt: the publish rule never threw away a real event because of a wrong end date.

## What the numbers say

- **`ab` was shipped.** It meets the acceptance rule on the pooled counts: no
  more misses than the baseline (2 against 3) and fewer false alarms (5 against 8).
- **`all` was rejected**, although it has the fewest false alarms. It doubled the
  misses. Reading them showed why: the audience rule dropped two children's shows,
  and the first recap wording dropped "one more weekend" and "last tickets"
  stories. The owner decided family plans stay. The shipped wording says those
  stories are still events.
- **The publish rule carries real weight.** At the read level the production
  model calls 8 or 9 posters of events already over "an event", with an end date
  before the moment the post was seen. The rule that drops ended events removes
  all of them. The reference
  model rejects these while reading, so it gets 0 here. That gap is invisible
  with only one score, and it means the date check must never be removed on the
  theory that the prompt handles it.

## What the numbers do not support

- **That `ab` is better by a precise amount.** A difference of 1 to 3 on 92 events
  is about the size of run-to-run flips: the same model missed two real events in
  one run and caught them in the other. The decision is a rule on counts, stated
  before looking, not a significance claim.
- **Production rates.** 400 images over ten days, from the accounts followed then,
  in a few cities. The random slice matches that mix and nothing wider.
- **Anything about other models.** A ten-model comparison on an earlier 150-image
  set exists and is not published. Its key was partly built from the production
  model's own answers, and a ranking from one small private set says more about
  the set than about the models.

## Cost

About $40 of API spend in total: roughly $6 per thousand images for the
production model and $15 for the reference model, plus $1.75 for the
cross-vendor check.

## Reproduce the method

The real images cannot be shared. `examples/synthetic/` has 20 invented posters
with a key, one per kind of case in the hit rule, and the same scorer. See the README.
