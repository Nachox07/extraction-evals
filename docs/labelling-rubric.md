# Labelling rubric

The rubric a labeller (a person or a model) follows to build the answer key. It is
generic on purpose: no production prompt wording, and no venue, account or post
names.

## The one question

At the moment the item was seen, could a member of the public still attend this
plan, or take it up?

Judge only from what the item shows: the image or images, the caption and the
account. A labeller is not told any model's answer and never sees the prompt
under test.

## event = true

The post announces a plan that anyone can still attend or take up at the seen
time. That includes a real offer with a date, and a standing weekly plan. A
programme poster listing several events is an event when at least one listed
event can still be attended; the day is the first such event.

## event = false

- The plan is already over at the seen time.
- There is no plan and no date.
- The plan is not open to the public (see closed groups below).

## Resolving dates

Relative words ("today", "tomorrow", "this Saturday", "tonight") are anchored to
the **publication** time. Use the publication time only to work out the calendar
date of the plan. Then compare that date and its hours with the **seen** time to
decide whether it can still be attended.

Example: a post published on a Friday at 20:00 saying "today, 22:00", seen on
Saturday at 08:00, is for Friday. It is over at the seen time, so event = false.
The same post seen on Friday at 21:00 is still attendable: event = true.

- A plan with a date but no hour is attendable until the end of that day.
- A plan that spans several days is attendable until its last day ends.
- `day` is the start day of the plan (empty when event = false). For a weekly
  plan, it is the next occurrence on or after the seen day, and the weekdays are
  listed as well.

## Closed groups

`closed_group = true` when the plan is not open to the general public in either
of these ways, and only when event = true:

- **(a) Enrolment course.** A recurring course where you must enrol to take part.
- **(b) Restricted activity.** An activity restricted to an age group or to members.

`closed_group = false` for anything open to anyone, including one-off public
events and a one-off activity anyone can book. Write down the basis for the answer.

## Confidence and reason

Give a confidence (high, medium, low) and a one-or-two-sentence reason that names
the date you computed and the seen time you compared it with.

## Why labellers must not see the prompt under test

If the labeller is shown the prompt's rules, the key repeats the prompt. A model
scored against that key is then graded on agreeing with its own instructions, and
two models that share the instructions will agree with each other whether or not
they are right. Agreement between model labellers is not truth when they share
the prompt under test. So the rubric above is written independently, every
labeller reads the same one, and labellers are blind to each other and to the
model being scored. Items where labellers disagree are scored apart, not voted in.
