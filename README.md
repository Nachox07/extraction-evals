# extraction-evals

A small harness for scoring a vision model that reads posters and decides
whether each one announces an event, and when.

It exists because the obvious metric, "accuracy against a key", hid every
failure that mattered in a real pipeline. The harness:

- counts **misses and false alarms apart**, because they cost different things;
- keeps **errors in the denominator**, so a model cannot score better by failing;
- scores at **two levels**: what the model read, and what would be published after
  the caller's policy (by default, events already over are dropped). A poster of
  an event that has already happened, read correctly and then stopped by the
  policy, gets its own count instead of disappearing;
- reports the **flip rate**, the items whose verdict changes between runs of the
  same model, which sets the noise floor for any comparison;
- fixes the **hit rule before any number is computed**: `docs/hit-rule.md`.

`REPORT.md` applies it to a production pipeline: 400 real images, an answer key
from a stronger model plus owner review plus a second-vendor cross-check, and a
prompt change that was shipped on the result.

## Run it

```bash
npm install
npm test                                   # scorer tests
npm run score -- examples/synthetic        # scores every answers-*.json there
```

`examples/synthetic/answers-fixture.json` is written by hand to show every
outcome. It is not a model's output. To score a real model on the synthetic set
(costs a few cents):

```bash
ANTHROPIC_API_KEY=... npm run run-model -- examples/synthetic claude-sonnet-5-5 --runs 2
npm run score -- examples/synthetic
```

`npm run posters` re-renders the 20 posters from `examples/synthetic/posters.json`.
Every venue, act and offer in them is invented.

## Layout

- `src/score.ts`: the scoring rules, with no I/O.
- `src/cli.ts`: reads `items.json`, `key.json` and `answers-*.json`, prints a table
  and the items that went wrong.
- `scripts/run-model.ts`: runs a Claude model with `prompts/extract-v1.md`.
- `docs/hit-rule.md`: what counts as a hit.

## Author

Nacho González-Garilleti. MIT licence.
