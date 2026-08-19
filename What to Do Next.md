- [ ] **Remove the streak-based state from the bandit for now.** Use one Q-value per user-word instead of separate Q-values for normal / correct-streak / wrong-streak states. The current reward logic does not actually implement the intended “ease off when struggling” behavior.

- [ ] **Keep the current bandit as the baseline.** Continue using the existing reward and epsilon-greedy selection so you have something simple to compare future changes against.

- [ ] **Improve the logging before collecting much more data.** For every answer, store at least: `is_correct`, `q_before`, `q_after`, `reward`, `selected_by` (`explore` or `exploit`), timestamp, and ideally time since the word was last seen.

- [x] **Analyze the current repeated-word data.** For user-word pairs that have multiple attempts, check whether reward tends to decrease with later attempts. Since high reward is associated with incorrect/difficult responses and lower reward with correct responses, a downward trend is your current proxy for improvement.

- [ ] **Watch specifically for “forgotten mastered words.”** Track cases like the one you found where the learner was correct, then after a long gap became incorrect. Record the delay between the last successful recall and the later failure. These cases show where your current bandit relies on rediscovering forgetting rather than predicting it.

- [ ] **Do not draw strong conclusions from the current 85-word dataset yet.** Use it to spot patterns and logging problems, but wait for substantially more repeated observations before judging whether Q predicts difficulty or whether the bandit improves learning.

- [ ] **Add a simple spaced-repetition mechanism next.** You do not need HLR immediately. Start by keeping a per-user-word review interval or `next_review_at`, where successful reviews extend the interval and failures shorten/reset it.

- [ ] **Let SR reviews still update the bandit.** When SR brings an old word back and the learner answers it, feed that result through the same reward/Q update. That way SR handles **when old knowledge needs checking**, while the bandit continues learning **which words deserve extra emphasis**.

- [ ] **Decide how SR and bandit selection interact.** Start with a simple policy such as showing due SR words first, then using the bandit normally. If too many words become due, later test interleaving rather than forcing every due word before bandit questions.

- [ ] **Leave streak/difficulty adaptation for later.** If you still want behavior like “after 3 wrong answers, give something easier,” implement that explicitly as its own policy instead of relying on separate Q tables. First get the simpler `SR + bandit` system working and measurable.

- [ ] **Eventually compare versions experimentally:** current bandit baseline vs. SR + bandit. The key outcome should be whether learners retain words better after meaningful delays, not merely whether immediate session accuracy increases.

- [ ] remove score field  from profile table.
