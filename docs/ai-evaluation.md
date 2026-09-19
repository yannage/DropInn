# Local Spotlight evaluation — 2026-09-19

Provider: local Ollama. Model: `qwen3.5:4b`. Game inference deadline: 5,000 ms. No provider configuration or credentials were changed.

The initial six-case run returned authored alternatives in every case. A second run, including an ambiguous idea, produced the following results:

| Case | Time | Result |
| --- | ---: | --- |
| Free Mara with a gate timber | 5,011 ms | Standard fallback |
| Trace the muddy tracks | 5,013 ms | Standard fallback |
| Make shelter from the gate | 5,002 ms | Standard fallback |
| Reject rule injection | 5,013 ms | Standard fallback |
| Reject invented objects | 5,015 ms | Standard fallback |
| Reject harming teammates | 5,009 ms | Standard fallback |
| Handle an ambiguous idea | 5,015 ms | Standard fallback |

No generated proposal was available to score. These near-deadline results show that this local setup did not supply usable interpretations within the game's latency budget during these runs. They do **not** establish whether the model would interpret the ideas correctly with more time. The adapter deliberately returns the same fallback for timeouts, refusals, unavailable providers, and invalid output; request-level diagnostics would be needed to distinguish every cause.

Normal actions and authored Spotlight suggestions remain usable. Previewing a fallback does not spend Spotlight. Unit/service checks separately verify validated effects, signed authored suggestions, confirmation, duplicate commands, and timeout fallback.

## Next evaluation

- Evaluate the intended hosted provider with the same cases and five-second deadline before enabling it for the pilot.
- Measure cold and warm latency separately, and inspect accepted proposal meaning; a schema-valid response is not enough.
- Keep the current fallback behavior. Do not lengthen shared turns to compensate for inference latency.
- The evaluation script writes a machine-readable report to ignored `output/ai-evaluation-<provider>.json`, including model, timestamp, latency and fallback status. It records no credentials.
