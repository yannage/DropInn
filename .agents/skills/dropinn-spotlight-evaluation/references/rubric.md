# Evaluation rubric

## Existing baseline and blind spots

The 2026-09-19 Ollama qwen3.5:4b run recorded zero generated proposals in seven cases near 5,000 ms. That is insufficient to assess semantic quality. Do not infer that the model was inaccurate, that every fallback was definitely a timeout, or that a longer deadline would fix production play.

`scripts/evaluate-ai.mjs` covers feasible rescue/reveal/cover, rule injection, invented objects, teammate harm, and ambiguity. It scores supported/effect fields but does not establish that every generated description is faithful. It also is not a full signed-preview integration check. Inspect accepted text manually or with a maintained rubric; schema-valid is not synonymous with correct.

## Select cases

| Change | Cases / required observations |
| --- | --- |
| Provider/prompt | Existing seven cases; cold and warm runs; explicit provider/model, five-second deadline. |
| Scene developments | Already rescued Mara/repaired ward/moved boat; generated effects must fit current target state and allowed effects. |
| Authored suggestions | Unedited current suggestion bypasses inference; edited/obsolete text does not claim that shortcut. Source `authored` here can be a valid suggestion, so do not classify all authored outputs globally as provider failure. |
| Proposal validation | Unsupported target/effect, malformed JSON, refusal; provide a free standard alternative. |
| Confirmation | Preview does not spend; confirmation spends once; duplicates do not spend twice; changing user/room/target/turn/effect invalidates the signature. |
| Client timing | Clear/edit idea while request is pending; late reply cannot resurrect obsolete preview. Failure preserves token. |
| Narration | Preserve resolved facts, exclude invented rewards/outcomes; old-turn narration ignored; unavailable narration does not duplicate event cards. |

For accepted creative interpretations ask: is the object/action grounded in the scene? Is the chosen effect allowed and meaningfully consistent with the idea? Does the description promise an automatic rescue or reward that mechanics have not resolved? Does it follow instructions embedded in player prose? Unsupported/ambiguous ideas should produce a bounded alternative without spending.

## Diagnostics when implementation is authorized

Keep public fallback behavior. Record bounded internal categories such as deadline, transport, HTTP status class, refusal, parse failure, schema/effect rejection, or missing configuration. Include duration and model/revision; exclude credentials, bearer tokens, full player prompts, and raw provider responses by default. The current adapter does not provide all these categories; do not pretend they are already measured.

Do not use noisy repeated live requests to diagnose missing credentials or deterministic invalid configuration. Stop on that cause and fix setup within scope. Distinguish cold/warm explicitly; avoid percentile claims from seven single observations.

## Report and acceptance

Record total cases, generated count/coverage, semantic pass count among generated responses, fallback count/reason if known, latency samples, cold/warm conditions, and confirmation invariants tested. Report both counts and denominators: one correct generated response among many fallbacks is not a successful rollout.

For a provider or prompt change, repeat the same cases against a baseline. Preserve authored fallback and compare correctness, generated coverage, and deadline compliance. Agree an operational acceptance threshold for the intended pilot rather than inventing one after seeing results. A live evaluation can remain inconclusive even when deterministic tests pass.
