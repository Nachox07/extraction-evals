# Case studies: measuring changes after the extraction step

`REPORT.md` measures the model that reads posters. These three case studies
measure what comes after it: who hosts a plan, how many dates it has, and
whether two cards are the same plan. Each one is a change to the production
pipeline, measured before it shipped.

Every example is synthetic. "Venue A", "Band X" and "Act Y" are invented, and no
real post, account or image appears here. The numbers are real aggregates from
private runs. Each study ends with what was verified and what was not.

| Case study | The change | The lesson |
|---|---|---|
| [1. Rule then model](01-host-attribution.md) | A cheap per-account rule flags relayed events; a small model confirms each one | +15.2 pts in-sample shrank to +2.5 pts on fresh cards (95% interval −2.5 to +7.5), mostly on fixed venues; relay recall 6/14. Freeze the rule, then score on unseen cards |
| [2. Replaying in both directions](02-replay-both-directions.md) | Split a caption with one act on several dates into one plan per date | A replay of the new rule's output cannot see what a stricter rule stopped doing. Diff old and new |
| [3. Duplicate detection](03-duplicate-detection.md) | A stricter duplicate rule, and two small-model judges on top | A trade-off shipped switched off; the two judge designs are about level once a bench cap was fixed; 198 of 822 labelled duplicates (24%) are out of reach of any same-place, same-day matcher |

All three changes run behind a switch, so turning one on is a separate
decision from measuring it.

[What's next](whats-next.md): replaying past agent mistakes to test whether a
fix changes behaviour.
