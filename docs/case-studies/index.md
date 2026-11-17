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
| [1. Rule then model](01-host-attribution.md) | A cheap per-account rule flags relayed events; a small model confirms each one | A rule alone made things worse (−5.1 pts); rule plus model, +10.1 pts. The best row was chosen after seeing errors, so it is in-sample; a held-out re-score is pending |
| [2. Replaying in both directions](02-replay-both-directions.md) | Split a caption with one act on several dates into one plan per date | A replay of the new rule's output cannot see what a stricter rule stopped doing. Diff old and new |
| [3. Duplicate detection](03-duplicate-detection.md) | A stricter duplicate rule, and two small-model judges on top | A trade-off shipped switched off; the two judge designs are about level once a bench cap was fixed; 198 of 822 duplicates (24%) are out of reach of any same-place, same-day matcher |

All three changes run behind a switch, so turning one on is a separate
decision from measuring it.

[What's next](whats-next.md): replaying past agent mistakes to test whether a
fix changes behaviour.
