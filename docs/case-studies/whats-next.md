# What's next: an agent lab

Coding agents write part of the code in this pipeline. When an agent
makes a mistake, the usual fix is a new rule in its instructions, a hook or a
test. Whether that fix changes what the agent does next time is rarely
measured.

The next study replays past agent mistakes. Each mistake becomes a task: the
same repo state, the same request. The agent runs it several times with and
without the fix. The score is pass^k: the share of tasks where all k runs
pass, not just one. An agent that gets it right one time in three has not
learned anything a user can rely on.

The question for each fix is simple: does it change behaviour, or only the
instructions?

Results are expected in December 2026. Nothing here is measured yet.
